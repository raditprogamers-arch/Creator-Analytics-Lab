"""Reports Page: Generate customized analytical summaries, visual digests, and CSV exports."""

from datetime import datetime, timezone
import streamlit as st
import pandas as pd
import plotly.express as px

from core.database import get_platforms
from analytics.metrics import get_latest_metrics_dataframe
from core.config import CONTENT_TYPES

st.set_page_config(page_title="Reports & Exports", page_icon="📑", layout="wide")

st.title("📑 Analytical Reports & Export")
st.markdown("Generate customized analytical summaries filtered by date, platform, and content categories. Export structured data for external reporting or spreadsheets.")

st.divider()

# Filter Controls
col_p, col_c, col_d = st.columns([1, 1, 1])

with col_p:
    platforms = get_platforms()
    plat_dict = {p["name"]: p["id"] for p in platforms}
    chosen_plat = st.selectbox("Platform", ["All Platforms"] + list(plat_dict.keys()), key="rep_plat")
    plat_id = plat_dict.get(chosen_plat)

with col_c:
    chosen_type = st.selectbox("Content Category", ["All Types"] + CONTENT_TYPES, key="rep_type")
    content_type_val = None if chosen_type == "All Types" else chosen_type

with col_d:
    use_date = st.checkbox("Filter by Publish Date", value=False, key="rep_date_check")
    s_date, e_date = None, None
    if use_date:
        d_range = st.date_input("Date Range", value=[], key="rep_date_range")
        if isinstance(d_range, (list, tuple)) and len(d_range) == 2:
            s_date, e_date = d_range

# Query Data
df = get_latest_metrics_dataframe(
    platform_id=plat_id,
    content_type=content_type_val,
    start_date=s_date,
    end_date=e_date,
)

if not df.empty:
    st.subheader("Report Overview & Summary")

    # Pivot into wide format for clean display and reporting
    pivot_df = df.pivot_table(
        index=["content_id", "title", "platform_name", "content_type", "language", "published_at"],
        columns="metric_name",
        values="metric_value",
        aggfunc="first",
    ).reset_index()

    # Summary metric cards
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Selected Items", len(pivot_df))
    if "views" in pivot_df.columns:
        m2.metric("Total Views", f"{int(pivot_df['views'].sum()):,}")
        m3.metric("Average Views", f"{int(pivot_df['views'].mean()):,}")
    if "likes" in pivot_df.columns:
        m4.metric("Total Likes", f"{int(pivot_df['likes'].sum()):,}")

    st.markdown("### Report Data Table")
    st.dataframe(pivot_df, use_container_width=True)

    # Optional report chart
    if "views" in pivot_df.columns and len(pivot_df) > 1:
        st.markdown("### Content Views Comparison")
        fig_rep = px.bar(
            pivot_df.sort_values(by="views", ascending=False).head(15),
            x="title",
            y="views",
            color="content_type",
            title="Views Breakdown for Selected Content Items",
            color_discrete_sequence=px.colors.qualitative.Plotly,
        )
        fig_rep.update_layout(template="plotly_dark", xaxis_tickangle=-45)
        st.plotly_chart(fig_rep, use_container_width=True)

    st.divider()

    # CSV Export Button
    csv_bytes = pivot_df.to_csv(index=False).encode("utf-8")
    report_timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"creator_report_{chosen_plat.replace(' ', '_').lower()}_{report_timestamp}.csv"

    st.download_button(
        label="📥 Download Structured Report as CSV",
        data=csv_bytes,
        file_name=filename,
        mime="text/csv",
        type="primary",
        use_container_width=True,
    )
else:
    st.info("No content records matched your selected report filter criteria.")
