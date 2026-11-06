"""Overview Dashboard for Creator Analytics Lab."""

from datetime import datetime, timezone
import streamlit as st
import pandas as pd
import plotly.express as px

from core.database import get_platforms
from analytics.metrics import (
    get_latest_metrics_dataframe,
    get_platform_summaries,
    get_timeline_metrics,
)
from core.config import CONTENT_TYPES, SUPPORTED_LANGUAGES

st.set_page_config(page_title="Overview Dashboard", page_icon="📊", layout="wide")

st.title("📊 Creator Overview Dashboard")
st.markdown("Holistic performance overview across your published music releases, covers, clips, and creator videos.")

st.divider()

# Global Filters Sidebar
st.sidebar.header("🔍 Global Filters")
platforms = get_platforms()
platform_options = {"All Platforms": None}
for p in platforms:
    platform_options[p["name"]] = p["id"]

selected_plat_label = st.sidebar.selectbox("Platform", options=list(platform_options.keys()))
selected_platform_id = platform_options[selected_plat_label]

type_options = ["All Types"] + CONTENT_TYPES
selected_type = st.sidebar.selectbox("Content Type", options=type_options)
filter_type = None if selected_type == "All Types" else selected_type

lang_options = ["All Languages"] + [l["name"] for l in SUPPORTED_LANGUAGES]
selected_lang = st.sidebar.selectbox("Language", options=lang_options)
filter_lang = None if selected_lang == "All Languages" else selected_lang

use_date_filter = st.sidebar.checkbox("Filter by Publish Date Range", value=False)
start_date_val = None
end_date_val = None
if use_date_filter:
    d_range = st.sidebar.date_input("Date Range", value=[])
    if isinstance(d_range, (list, tuple)) and len(d_range) == 2:
        start_date_val, end_date_val = d_range

# Fetch filtered metrics
df = get_latest_metrics_dataframe(
    platform_id=selected_platform_id,
    content_type=filter_type,
    language=filter_lang,
    start_date=start_date_val,
    end_date=end_date_val,
)

summaries = get_platform_summaries()

# Metric Cards Rows
st.subheader("Key Performance Indicators")

total_content_count = len(df["content_id"].unique()) if not df.empty else 0

def get_metric_sum(m_name: str) -> Optional[float]:
    if df.empty:
        return None
    subset = df[df["metric_name"] == m_name]["metric_value"]
    return subset.sum() if not subset.empty else None

tot_views = get_metric_sum("views")
tot_likes = get_metric_sum("likes")
tot_comments = get_metric_sum("comments")
tot_shares = get_metric_sum("shares")
tot_streams = get_metric_sum("streams")
tot_watch = get_metric_sum("watch_time_hours")

k1, k2, k3 = st.columns(3)
k1.metric("Published Catalog Items", f"{total_content_count:,}")
k1.caption("Total distinct videos, songs, and covers")
k2.metric("Total Views", f"{int(tot_views):,}" if tot_views is not None else "N/A")
k2.caption("Video plays across YouTube, TikTok, Reels")
k3.metric("Audio Streams", f"{int(tot_streams):,}" if tot_streams is not None else "N/A")
k3.caption("Track streams across Spotify & streaming")

k4, k5, k6 = st.columns(3)
k4.metric("Total Likes", f"{int(tot_likes):,}" if tot_likes is not None else "N/A")
k4.caption("Audience likes & reactions")
k5.metric("Total Comments", f"{int(tot_comments):,}" if tot_comments is not None else "N/A")
k5.caption("Audience comments & replies")
k6.metric("Total Shares", f"{int(tot_shares):,}" if tot_shares is not None else "N/A")
k6.caption("Community shares & reposts")

st.caption("ℹ️ *Missing metrics are explicitly designated as 'N/A' rather than zero, preventing distortion between streaming and video platforms.*")

st.divider()

# Charts: Platform Breakdown & Distribution
col_left, col_right = st.columns(2)

with col_left:
    st.subheader("Platform Distribution")
    if summaries:
        sum_df = pd.DataFrame(summaries)
        active_sum = sum_df[sum_df["total_content"] > 0]
        if not active_sum.empty:
            fig_plat = px.pie(
                active_sum,
                names="platform_name",
                values="total_content",
                color_discrete_sequence=["#00E599", "#20C997", "#0D6EFD", "#6F42C1", "#E83E8C"],
                hole=0.45,
            )
            fig_plat.update_layout(margin=dict(t=10, b=10, l=10, r=10), template="plotly_dark")
            st.plotly_chart(fig_plat, use_container_width=True)
        else:
            st.info("No content published yet. Ingest CSV data in the Data Import tab.")
    else:
        st.info("No platforms configured.")

with col_right:
    st.subheader("Content Type Breakdown")
    if not df.empty:
        type_counts = df.drop_duplicates(subset=["content_id"])["content_type"].value_counts().reset_index()
        type_counts.columns = ["Content Type", "Count"]
        fig_type = px.bar(
            type_counts,
            x="Content Type",
            y="Count",
            color="Content Type",
            color_discrete_sequence=px.colors.qualitative.Plotly,
        )
        fig_type.update_layout(margin=dict(t=10, b=10, l=10, r=10), template="plotly_dark", showlegend=False)
        st.plotly_chart(fig_type, use_container_width=True)
    else:
        st.info("No content matches the selected filters.")

st.divider()

# Performance Timeline
st.subheader("Performance Over Time")
timeline_metric = st.selectbox("Select Timeline Metric", ["views", "likes", "streams", "comments"], index=0)
df_timeline = get_timeline_metrics(platform_id=selected_platform_id, metric_name=timeline_metric)

if not df_timeline.empty:
    fig_time = px.line(
        df_timeline,
        x="date",
        y="total_value",
        color="platform",
        markers=True,
        title=f"Total {timeline_metric.capitalize()} Recorded Over Snapshot Dates",
        color_discrete_sequence=["#00E599", "#0D6EFD", "#FF007F", "#6F42C1"],
    )
    fig_time.update_layout(template="plotly_dark")
    st.plotly_chart(fig_time, use_container_width=True)
else:
    st.info(f"No snapshot history recorded for metric '{timeline_metric}'.")

st.divider()

# Top Performing Content Table
st.subheader("Top Content by Views / Streams")
if not df.empty:
    top_candidates = df[df["metric_name"].isin(["views", "streams"])].sort_values(by="metric_value", ascending=False)
    if not top_candidates.empty:
        display_df = top_candidates[["title", "platform_name", "content_type", "language", "metric_name", "metric_value"]].rename(
            columns={
                "title": "Title",
                "platform_name": "Platform",
                "content_type": "Type",
                "language": "Language",
                "metric_name": "Metric",
                "metric_value": "Count",
            }
        ).head(10)
        st.dataframe(display_df, use_container_width=True)
    else:
        st.info("No views or streams metrics found.")
else:
    st.info("No content available yet. Use the **Data Import** page to upload CSV exports.")
