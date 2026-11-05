"""System & Database Status Page for Creator Analytics Lab."""

import streamlit as st
import pandas as pd
from core.database import test_connection, init_db, get_overview_counts
from core.config import get_database_url, mask_database_url

st.set_page_config(page_title="System & Database Status", page_icon="⚙️", layout="wide")

st.title("⚙️ System & Database Status")
st.markdown("Monitor connection health, Neon PostgreSQL connectivity, schema tables, and operational environment.")

st.divider()

# Connection Test Section
st.subheader("Neon PostgreSQL Connectivity")

col_btn, col_info = st.columns([1, 4])
with col_btn:
    recheck = st.button("🔄 Test Connection Now", use_container_width=True)

with st.spinner("Connecting to Neon PostgreSQL..."):
    conn_result = test_connection()

if conn_result["success"]:
    st.success(f"Connected to Neon PostgreSQL in **{conn_result['latency_ms']} ms**")
    
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.metric(label="Status", value="Healthy")
    with m2:
        st.metric(label="Latency", value=f"{conn_result['latency_ms']} ms")
    with m3:
        st.metric(label="Database", value=conn_result.get("database", "N/A"))
    with m4:
        st.metric(label="User", value=conn_result.get("user", "N/A"))

    with st.expander("🔍 Connection & Server Details", expanded=True):
        st.code(
            f"Endpoint: {conn_result['masked_url']}\n"
            f"Server Time: {conn_result.get('server_time')}\n"
            f"PostgreSQL Version: {conn_result.get('version')}",
            language="text"
        )
else:
    st.error(f"❌ Connection Failed: {conn_result.get('error')}")
    st.warning("Please check your `.env` or Streamlit Secrets configuration.")

st.divider()

# Database Schema & Tables
st.subheader("Database Schema & Tables")
col_init, col_counts = st.columns([1, 2])

with col_init:
    st.markdown("**Schema Initialization**")
    st.caption("Verifies all entity tables (`platforms`, `contents`, `metric_snapshots`, `import_history`) and seeds standard platforms.")
    if st.button("🛠️ Initialize / Verify Schema", use_container_width=True):
        with st.spinner("Running schema initialization..."):
            init_res = init_db()
            if init_res["success"]:
                st.success(f"Schema validated. Tables verified: {', '.join(init_res['tables_created'])}")
                if init_res["platforms_seeded"] > 0:
                    st.info(f"Seeded {init_res['platforms_seeded']} initial platform records.")
            else:
                st.error("Schema initialization failed.")

with col_counts:
    st.markdown("**Current Table Record Counts**")
    counts = get_overview_counts()
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Platforms", counts["platforms"])
    c2.metric("Contents", counts["contents"])
    c3.metric("Snapshots", counts["snapshots"])
    c4.metric("Imports", counts["imports"])

if conn_result.get("tables"):
    st.markdown("**Existing Tables in Database:**")
    st.dataframe(pd.DataFrame({"Table Name": conn_result["tables"]}), use_container_width=True)

