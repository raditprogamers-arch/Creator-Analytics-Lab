"""Creator Analytics Lab - Personal Multi-Platform Creator Analytics & Research Platform.
Main Application Entry Point.
"""

import streamlit as st
from core.database import test_connection, get_overview_counts
from core.config import mask_database_url, get_database_url

st.set_page_config(
    page_title="Creator Analytics Lab",
    page_icon="🎙️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Sidebar System Health Status Indicator
with st.sidebar:
    st.title("🎙️ Creator Lab")
    st.caption("Personal Creator Analytics & Research")
    
    # Live Neon PostgreSQL Connectivity Check
    conn_info = test_connection()
    if conn_info["success"]:
        st.success(f"🟢 **Neon DB Connected** ({conn_info['latency_ms']} ms)")
    else:
        st.error("🔴 **Neon DB Disconnected**")
        st.caption(conn_info.get("error", "Check DATABASE_URL"))

    counts = get_overview_counts()
    st.markdown("---")
    st.markdown(f"**Catalog:** {counts['contents']} items | {counts['snapshots']} snapshots")
    st.markdown("---")

# Setup Navigation with st.navigation
pages = {
    "Overview": [
        st.Page("pages/dashboard.py", title="Dashboard", icon="📊"),
        st.Page("pages/content.py", title="Content Management", icon="🎬"),
    ],
    "Analytics": [
        st.Page("pages/analytics.py", title="Analytics", icon="📈"),
        st.Page("pages/reports.py", title="Reports & Exports", icon="📑"),
    ],
    "Data & Operations": [
        st.Page("pages/data_import.py", title="Data Import", icon="📥"),
        st.Page("pages/system_status.py", title="System & Database", icon="⚙️"),
    ],
}

nav = st.navigation(pages)
nav.run()

