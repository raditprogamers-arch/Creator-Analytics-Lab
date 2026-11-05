"""Reports Page: Generate customized analytical summaries and export CSV files."""

import streamlit as st
import pandas as pd
from core.database import get_platforms
from analytics.metrics import get_latest_metrics_dataframe
from core.config import CONTENT_TYPES

st.set_page_config(page_title="Reports", page_icon="📑", layout="wide")

st.title("📑 Analytical Reports & Export")
st.markdown("Generate custom analytical digests filtered by date, platform, and content categories.")

st.divider()

col_p, col_c = st.columns(2)
with col_p:
    platforms = get_platforms()
    plat_dict = {p["name"]: p["id"] for p in platforms}
    chosen_plat = st.selectbox("Filter Platform", ["All Platforms"] + list(plat_dict.keys()))
    plat_id = plat_dict.get(chosen_plat)

with col_c:
    chosen_type = st.selectbox("Filter Content Type", ["All Types"] + CONTENT_TYPES)
    content_type_val = None if chosen_type == "All Types" else chosen_type

df = get_latest_metrics_dataframe(platform_id=plat_id, content_type=content_type_val)

if not df.empty:
    st.subheader("Report Summary Data")
    
    # Pivot for clean reporting
    pivot_df = df.pivot_table(
        index=["content_id", "title", "platform_name", "content_type", "language", "published_at"],
        columns="metric_name",
        values="metric_value",
        aggfunc="first",
    ).reset_index()

    st.dataframe(pivot_df, use_container_width=True)

    # Export to CSV
    csv_bytes = pivot_df.to_csv(index=False).encode("utf-8")
    st.download_button(
        label="📥 Download Report as CSV",
        data=csv_bytes,
        file_name=f"creator_analytics_report_{chosen_plat}_{chosen_type}.csv",
        mime="text/csv",
        type="primary",
    )
else:
    st.info("No records matching the selected report criteria.")

