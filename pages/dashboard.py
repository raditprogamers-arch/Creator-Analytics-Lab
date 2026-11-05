"""Overview Dashboard for Creator Analytics Lab."""

import streamlit as st
import pandas as pd
import plotly.express as px
from core.database import get_platforms
from analytics.metrics import get_latest_metrics_dataframe, get_platform_summaries
from core.config import CONTENT_TYPES, SUPPORTED_LANGUAGES

st.set_page_config(page_title="Overview Dashboard", page_icon="📊", layout="wide")

st.title("📊 Creator Overview Dashboard")
st.markdown("Holistic performance overview across your published music releases, covers, and content.")

st.divider()

# Global Filters Sidebar
st.sidebar.header("🔍 Filters")
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

# Data Fetching
df = get_latest_metrics_dataframe(
    platform_id=selected_platform_id,
    content_type=filter_type,
    language=filter_lang,
)

summaries = get_platform_summaries()

# Metric Cards Row
st.subheader("Key Performance Indicators")
col1, col2, col3, col4 = st.columns(4)

total_content_count = len(df["content_id"].unique()) if not df.empty else 0

views_subset = df[df["metric_name"] == "views"]["metric_value"] if not df.empty else pd.Series([], dtype=float)
total_views = views_subset.sum() if not views_subset.empty else None

likes_subset = df[df["metric_name"] == "likes"]["metric_value"] if not df.empty else pd.Series([], dtype=float)
total_likes = likes_subset.sum() if not likes_subset.empty else None

comments_subset = df[df["metric_name"] == "comments"]["metric_value"] if not df.empty else pd.Series([], dtype=float)
total_comments = comments_subset.sum() if not comments_subset.empty else None

with col1:
    st.metric("Total Published Content", f"{total_content_count:,}")
with col2:
    st.metric("Total Views", f"{int(total_views):,}" if total_views is not None else "N/A")
with col3:
    st.metric("Total Likes", f"{int(total_likes):,}" if total_likes is not None else "N/A")
with col4:
    st.metric("Total Comments", f"{int(total_comments):,}" if total_comments is not None else "N/A")

st.caption("ℹ️ *Missing metrics are reported as 'N/A' rather than zero to maintain data integrity across different platform APIs.*")

st.divider()

# Charts Section
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
                hole=0.4,
            )
            fig_plat.update_layout(margin=dict(t=10, b=10, l=10, r=10), template="plotly_dark")
            st.plotly_chart(fig_plat, use_container_width=True)
        else:
            st.info("No content published yet. Import CSV data in the Data Import tab.")
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

# Top Performing Content Table
st.subheader("Top Content by Views")
if not df.empty:
    views_df = df[df["metric_name"] == "views"].sort_values(by="metric_value", ascending=False)
    if not views_df.empty:
        display_df = views_df[["title", "platform_name", "content_type", "language", "metric_value"]].rename(
            columns={
                "title": "Title",
                "platform_name": "Platform",
                "content_type": "Type",
                "language": "Language",
                "metric_value": "Views",
            }
        ).head(10)
        st.dataframe(display_df, use_container_width=True)
    else:
        st.info("No views metrics recorded for current content.")
else:
    st.info("No content available yet. Use the **Data Import** page to upload CSV exports.")

