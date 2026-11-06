"""Data Import Page: Upload, interactive column mapping, validation dry-run, and persistence."""

from datetime import datetime, timezone
import json
import streamlit as st
import pandas as pd
from sqlalchemy import select, text

from core.database import get_platforms, get_db_session, ImportHistory, Platform, MetricSnapshot, Content
from core.importer import (
    process_dataset_import,
    auto_detect_adapter,
    validate_dataset_dry_run,
    get_adapter_for_platform,
    CustomMappingAdapter,
    rollback_import,
)
from core.config import CONTENT_TYPES, SUPPORTED_LANGUAGES

st.set_page_config(page_title="Data Import", page_icon="📥", layout="wide")

st.title("📥 Data Ingestion & Import Studio")
st.markdown("Import creator performance datasets with platform auto-detection, interactive custom column mapping, validation dry-runs, and full audit logs.")

st.divider()

tab_import, tab_custom, tab_history = st.tabs([
    "📤 Upload & Platform Adapters",
    "🛠️ Interactive Column Mapper",
    "📜 Import Audit History & Rollback",
])

# ----------------------------------------------------
# TAB 1: STANDARD PLATFORM ADAPTERS
# ----------------------------------------------------
with tab_import:
    st.subheader("1. Platform Selection & Data File")

    platforms = get_platforms()
    platform_names = [p["name"] for p in platforms] if platforms else ["YouTube", "TikTok", "Spotify", "Instagram"]

    col_p, col_date = st.columns([1, 1])
    with col_p:
        selected_platform = st.selectbox("Select Target Platform", options=platform_names, key="std_platform")
    with col_date:
        snapshot_date = st.date_input("Measurement Snapshot Date", value=datetime.now(timezone.utc).date(), key="std_date")

    # Demo Dataset Quick Loader
    with st.expander("🧪 Or Load Pre-Packaged Demonstration Datasets", expanded=False):
        col_demo1, col_demo2, col_demo3, col_demo4 = st.columns(4)
        demo_df = None
        demo_filename = None
        if col_demo1.button("YouTube Music Demo", use_container_width=True):
            demo_df = pd.read_csv("data/sample_youtube_demonstration.csv")
            demo_filename = "sample_youtube_demonstration.csv"
            st.session_state["active_demo"] = (demo_df, demo_filename, "YouTube")
        if col_demo2.button("TikTok Clips Demo", use_container_width=True):
            demo_df = pd.read_csv("data/sample_tiktok_demonstration.csv")
            demo_filename = "sample_tiktok_demonstration.csv"
            st.session_state["active_demo"] = (demo_df, demo_filename, "TikTok")
        if col_demo3.button("Spotify Singles Demo", use_container_width=True):
            demo_df = pd.read_csv("data/sample_spotify_demonstration.csv")
            demo_filename = "sample_spotify_demonstration.csv"
            st.session_state["active_demo"] = (demo_df, demo_filename, "Spotify")
        if col_demo4.button("Instagram Reels Demo", use_container_width=True):
            demo_df = pd.read_csv("data/sample_instagram_demonstration.csv")
            demo_filename = "sample_instagram_demonstration.csv"
            st.session_state["active_demo"] = (demo_df, demo_filename, "Instagram")

    uploaded_file = st.file_uploader("Upload CSV export file", type=["csv"], key="std_uploader")

    df_to_process = None
    target_filename = None

    if uploaded_file is not None:
        try:
            df_to_process = pd.read_csv(uploaded_file)
            target_filename = uploaded_file.name
        except Exception as e:
            st.error(f"Error parsing uploaded CSV: {e}")
    elif "active_demo" in st.session_state:
        df_to_process, target_filename, demo_plat = st.session_state["active_demo"]
        st.info(f"Loaded demonstration file: **{target_filename}** ({len(df_to_process)} records)")

    if df_to_process is not None:
        st.markdown("### 2. File Preview & Schema Detection")
        st.dataframe(df_to_process.head(5), use_container_width=True)

        detected_adapter = auto_detect_adapter(list(df_to_process.columns))
        if detected_adapter:
            st.success(f"✨ Auto-detected adapter: **{detected_adapter.platform_name}** matching columns `{list(df_to_process.columns)[:4]}`")

        # Dry Run Validation Preview
        captured_dt = datetime.combine(snapshot_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        adapter_to_use = get_adapter_for_platform(selected_platform) or detected_adapter

        st.markdown("### 3. Pre-Import Validation Dry Run")
        if adapter_to_use:
            dry_run = validate_dataset_dry_run(df_to_process, adapter_to_use, captured_dt)
            m1, m2, m3 = st.columns(3)
            m1.metric("Total Rows in File", dry_run["total_count"])
            m2.metric("Valid Rows Ready", dry_run["valid_count"])
            m3.metric("Rejected / Invalid Rows", dry_run["rejected_count"])

            if dry_run["rejected_count"] > 0:
                st.warning(f"⚠️ {dry_run['rejected_count']} rows contain validation errors and will be rejected.")
                with st.expander("Inspect Validation Failures"):
                    st.json(dry_run["rejected_details"])

            with st.expander("Preview Normalized Record Samples (First 3)", expanded=False):
                st.json(dry_run["sample_mapped"][:3])

            st.divider()

            if st.button("🚀 Confirm & Ingest into Neon PostgreSQL", type="primary", use_container_width=True, key="std_commit"):
                with st.spinner("Writing to Neon PostgreSQL within a database transaction..."):
                    import_res = process_dataset_import(
                        df=df_to_process,
                        filename=target_filename or "upload.csv",
                        platform_name=selected_platform,
                        captured_at=captured_dt,
                    )

                if import_res["success"]:
                    st.success(f"✅ Ingestion Succeeded! Import Record #{import_res['import_id']}")
                    c1, c2, c3, c4 = st.columns(4)
                    c1.metric("Imported Rows", import_res["successful_rows"])
                    c2.metric("Rejected Rows", import_res["rejected_rows"])
                    c3.metric("New Content Catalog Items", import_res["new_contents_created"])
                    c4.metric("Metric Snapshots Saved", import_res["snapshots_recorded"])
                    if "active_demo" in st.session_state:
                        del st.session_state["active_demo"]
                else:
                    st.error("❌ Import failed. No records were stored.")
        else:
            st.warning("No standard adapter found. Please use the **Interactive Column Mapper** tab.")

# ----------------------------------------------------
# TAB 2: INTERACTIVE CUSTOM COLUMN MAPPER
# ----------------------------------------------------
with tab_custom:
    st.subheader("Interactive Custom Column Mapping")
    st.markdown("Map any custom CSV export structure directly into canonical platform, content, and metric fields.")

    custom_file = st.file_uploader("Upload custom CSV file", type=["csv"], key="custom_uploader")
    if custom_file is not None:
        try:
            custom_df = pd.read_csv(custom_file)
            cols = list(custom_df.columns)
            st.success(f"Loaded **{custom_file.name}** with {len(custom_df)} rows and {len(cols)} columns.")
            st.dataframe(custom_df.head(3), use_container_width=True)

            st.markdown("#### Step 1: Destination Platform")
            c_plat = st.selectbox("Target Platform", platform_names, key="cust_plat_name")

            st.markdown("#### Step 2: Content Identifier & Metadata Mapping")
            cm1, cm2 = st.columns(2)
            with cm1:
                id_col = st.selectbox("External ID Column (Required)", options=cols, index=0)
                title_col = st.selectbox("Title Column (Required)", options=cols, index=min(1, len(cols)-1))
                pub_col = st.selectbox("Published Date Column (Optional)", options=["None"] + cols)
            with cm2:
                default_type = st.selectbox("Default Content Type", CONTENT_TYPES, index=0)
                type_col = st.selectbox("Content Type Column (Optional)", options=["None"] + cols)
                
                lang_names = [l["name"] for l in SUPPORTED_LANGUAGES]
                default_lang = st.selectbox("Default Language", ["None"] + lang_names, index=1)
                lang_col = st.selectbox("Language Column (Optional)", options=["None"] + cols)

            st.markdown("#### Step 3: Metrics Column Mapping")
            st.caption("Select which CSV columns correspond to canonical creator performance metrics:")

            metrics_to_map = [
                ("views", "Views / Plays"),
                ("likes", "Likes / Reactions"),
                ("comments", "Comments"),
                ("shares", "Shares / Reposts"),
                ("watch_time_hours", "Watch Time (Hours)"),
                ("impressions", "Impressions"),
                ("streams", "Audio Streams"),
                ("saves", "Saves / Bookmarks"),
                ("listeners", "Unique Listeners"),
            ]

            custom_metric_map = {}
            col_m1, col_m2, col_m3 = st.columns(3)
            for i, (m_slug, m_label) in enumerate(metrics_to_map):
                target_col = [col_m1, col_m2, col_m3][i % 3]
                with target_col:
                    # Smart guess default index
                    matched_idx = 0
                    for c_idx, c in enumerate(cols):
                        if m_slug in c.lower() or m_label.lower().split()[0] in c.lower():
                            matched_idx = c_idx + 1
                            break
                    mapped_csv_col = st.selectbox(f"{m_label}", options=["None"] + cols, index=matched_idx, key=f"cust_m_{m_slug}")
                    if mapped_csv_col != "None":
                        custom_metric_map[m_slug] = mapped_csv_col

            custom_adapter = CustomMappingAdapter(
                platform_name=c_plat,
                id_col=id_col,
                title_col=title_col,
                published_at_col=None if pub_col == "None" else pub_col,
                content_type_col=None if type_col == "None" else type_col,
                language_col=None if lang_col == "None" else lang_col,
                default_content_type=default_type,
                default_language=None if default_lang == "None" else default_lang,
                metric_mappings=custom_metric_map,
            )

            st.markdown("#### Step 4: Validate & Ingest")
            now_dt = datetime.now(timezone.utc)
            dry_run_custom = validate_dataset_dry_run(custom_df, custom_adapter, now_dt)

            d1, d2, d3 = st.columns(3)
            d1.metric("Rows Evaluated", dry_run_custom["total_count"])
            d2.metric("Valid Rows", dry_run_custom["valid_count"])
            d3.metric("Invalid Rows", dry_run_custom["rejected_count"])

            if st.button("🚀 Ingest with Custom Mapping", type="primary", use_container_width=True):
                with st.spinner("Ingesting custom mapped dataset into Neon..."):
                    res = process_dataset_import(
                        df=custom_df,
                        filename=custom_file.name,
                        platform_name=c_plat,
                        captured_at=now_dt,
                        custom_adapter=custom_adapter,
                    )
                if res["success"]:
                    st.success(f"✅ Successfully ingested {res['successful_rows']} rows! Import ID: #{res['import_id']}")
                else:
                    st.error("Failed to import. Inspect rejected rows.")
        except Exception as e:
            st.error(f"Error handling custom file: {e}")

# ----------------------------------------------------
# TAB 3: IMPORT HISTORY & ROLLBACK
# ----------------------------------------------------
with tab_history:
    st.subheader("Ingestion Audit Trail")
    st.caption("Inspect past data ingestions, review error diagnostics, and rollback bad imports if necessary.")

    with get_db_session() as session:
        hist_rows = session.execute(
            select(
                ImportHistory.id,
                ImportHistory.filename,
                Platform.name.label("platform_name"),
                ImportHistory.imported_at,
                ImportHistory.total_rows,
                ImportHistory.successful_rows,
                ImportHistory.rejected_rows,
                ImportHistory.import_status,
                ImportHistory.error_summary,
            )
            .join(Platform, ImportHistory.platform_id == Platform.id, isouter=True)
            .order_by(ImportHistory.imported_at.desc())
        ).fetchall()

    if hist_rows:
        df_history = pd.DataFrame(
            [
                {
                    "Import ID": r.id,
                    "Filename": r.filename,
                    "Platform": r.platform_name or "N/A",
                    "Timestamp (UTC)": r.imported_at.strftime("%Y-%m-%d %H:%M:%S") if r.imported_at else "N/A",
                    "Total Rows": r.total_rows,
                    "Successful": r.successful_rows,
                    "Rejected": r.rejected_rows,
                    "Status": r.import_status,
                }
                for r in hist_rows
            ]
        )
        st.dataframe(df_history, use_container_width=True)

        st.divider()

        # Detailed Inspection & Rollback
        st.subheader("Inspect Import Details or Rollback")
        selected_import_id = st.selectbox(
            "Select Import ID to inspect:",
            options=[r.id for r in hist_rows],
            format_func=lambda x: f"Import #{x} ({next(r.filename for r in hist_rows if r.id == x)})",
        )

        chosen_record = next(r for r in hist_rows if r.id == selected_import_id)

        col_details, col_actions = st.columns([2, 1])

        with col_details:
            st.markdown(f"**Details for Import #{chosen_record.id}**")
            st.write(f"- **Filename:** {chosen_record.filename}")
            st.write(f"- **Platform:** {chosen_record.platform_name}")
            st.write(f"- **Imported At:** {chosen_record.imported_at}")
            st.write(f"- **Success Ratio:** {chosen_record.successful_rows} / {chosen_record.total_rows}")

            if chosen_record.error_summary:
                with st.expander("View Error Summary & Rejected Rows"):
                    try:
                        err_parsed = json.loads(chosen_record.error_summary)
                        st.json(err_parsed)
                    except Exception:
                        st.text(chosen_record.error_summary)

        with col_actions:
            st.markdown("**Rollback Management**")
            st.warning("Rolling back will remove this import record and delete all metric snapshots created by it.")
            rollback_confirm = st.checkbox(f"Confirm rollback of Import #{chosen_record.id}")
            if st.button("🗑️ Rollback Import", type="primary") and rollback_confirm:
                with st.spinner("Deleting snapshots and import record..."):
                    rb_result = rollback_import(chosen_record.id)
                if rb_result["success"]:
                    st.success(f"Rollback successful. Removed {rb_result['deleted_snapshots']} snapshots.")
                    st.rerun()
                else:
                    st.error(f"Rollback failed: {rb_result.get('error')}")

    else:
        st.info("No imports recorded yet.")
