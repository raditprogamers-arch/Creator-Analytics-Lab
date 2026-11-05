"""Data Import Page: Upload, validate, and persist platform analytics datasets."""

from datetime import datetime, timezone
import streamlit as st
import pandas as pd
from core.database import get_platforms, get_db_session, ImportHistory, Platform
from core.importer import process_dataset_import, auto_detect_adapter
from sqlalchemy import select

st.set_page_config(page_title="Data Import", page_icon="📥", layout="wide")

st.title("📥 Data Import")
st.markdown("Import creator performance datasets from CSV exports. Supports YouTube, TikTok, Spotify, and custom platforms with schema validation and duplicate prevention.")

st.divider()

# Tab 1: Upload & Import, Tab 2: Import History
tab_import, tab_history = st.tabs(["📤 Upload New Dataset", "📜 Import History & Audit"])

with tab_import:
    st.subheader("1. Select Source Platform & File")
    
    platforms = get_platforms()
    platform_names = [p["name"] for p in platforms] if platforms else ["YouTube", "TikTok", "Spotify"]
    
    col_p, col_date = st.columns([1, 1])
    with col_p:
        selected_platform = st.selectbox("Platform", options=platform_names)
    with col_date:
        snapshot_date = st.date_input("Measurement Snapshot Date", value=datetime.now(timezone.utc).date())

    uploaded_file = st.file_uploader("Choose a CSV export file", type=["csv"])

    if uploaded_file is not None:
        try:
            df = pd.read_csv(uploaded_file)
            st.success(f"File loaded successfully: **{uploaded_file.name}** ({len(df)} rows, {len(df.columns)} columns)")

            # Auto-detection notice
            detected = auto_detect_adapter(list(df.columns))
            if detected and detected.platform_name != selected_platform:
                st.info(f"💡 Headers match typical format for **{detected.platform_name}**. Selected platform: **{selected_platform}**.")

            st.markdown("### 2. Dataset Preview (First 5 Rows)")
            st.dataframe(df.head(5), use_container_width=True)

            st.markdown("### 3. Column Mapping Summary")
            cols_preview = [{"Column Name": c, "Non-Null Count": df[c].count(), "Sample Value": df[c].dropna().iloc[0] if not df[c].dropna().empty else "None"} for c in df.columns]
            st.dataframe(pd.DataFrame(cols_preview), use_container_width=True)

            st.divider()

            # Process Import Button
            if st.button("🚀 Validate & Import Dataset", type="primary", use_container_width=True):
                captured_dt = datetime.combine(snapshot_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                with st.spinner("Processing validation, normalization, and database transaction..."):
                    result = process_dataset_import(
                        df=df,
                        filename=uploaded_file.name,
                        platform_name=selected_platform,
                        captured_at=captured_dt,
                    )

                if result["success"]:
                    st.success(f"✅ Import Successful (Status: {result['status']})")
                    r1, r2, r3, r4 = st.columns(4)
                    r1.metric("Total Rows", result["total_rows"])
                    r2.metric("Successful Rows", result["successful_rows"])
                    r3.metric("New Content Created", result["new_contents_created"])
                    r4.metric("Metric Snapshots", result["snapshots_recorded"])

                    if result["rejected_rows"] > 0:
                        st.warning(f"⚠️ {result['rejected_rows']} rows were rejected during validation.")
                        with st.expander("Inspect Rejected Rows"):
                            st.json(result["rejected_details"])
                else:
                    st.error("❌ Import Failed. No valid rows could be imported.")
                    with st.expander("Inspect Errors"):
                        st.json(result["rejected_details"])

        except Exception as e:
            st.error(f"Error reading CSV file: {str(e)}")

with tab_history:
    st.subheader("Historical Ingestions")
    with get_db_session() as session:
        records = session.execute(
            select(
                ImportHistory.id,
                ImportHistory.filename,
                Platform.name.label("platform"),
                ImportHistory.imported_at,
                ImportHistory.total_rows,
                ImportHistory.successful_rows,
                ImportHistory.rejected_rows,
                ImportHistory.import_status,
            )
            .join(Platform, ImportHistory.platform_id == Platform.id, isouter=True)
            .order_by(ImportHistory.imported_at.desc())
        ).fetchall()

    if records:
        history_df = pd.DataFrame(records, columns=["ID", "Filename", "Platform", "Imported At", "Total Rows", "Successful", "Rejected", "Status"])
        st.dataframe(history_df, use_container_width=True)
    else:
        st.info("No datasets have been imported yet.")

