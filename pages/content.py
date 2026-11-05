"""Content Management: Search, filter, inspect, edit, and delete published content."""

import streamlit as st
import pandas as pd
from sqlalchemy import select, text
from core.database import get_db_session, Content, Platform, MetricSnapshot
from core.config import CONTENT_TYPES, SUPPORTED_LANGUAGES

st.set_page_config(page_title="Content Management", page_icon="🎬", layout="wide")

st.title("🎬 Content Management")
st.markdown("Browse, inspect, and update metadata for your catalog of music releases, covers, and videos.")

st.divider()

# Search and Filters
col_search, col_p, col_t, col_l = st.columns([2, 1, 1, 1])
with col_search:
    search_query = st.text_input("Search by title or external ID", "")

with get_db_session() as session:
    platforms_raw = session.execute(select(Platform.name)).scalars().all()

with col_p:
    plat_filter = st.selectbox("Platform", ["All"] + platforms_raw)
with col_t:
    type_filter = st.selectbox("Type", ["All"] + CONTENT_TYPES)
with col_l:
    lang_filter = st.selectbox("Language", ["All"] + [l["name"] for l in SUPPORTED_LANGUAGES])

# Query Database
query = """
SELECT 
    c.id,
    c.title,
    p.name as platform,
    c.content_type,
    c.language,
    c.external_id,
    c.published_at,
    c.content_url
FROM contents c
JOIN platforms p ON c.platform_id = p.id
WHERE 1=1
"""
params = {}

if search_query.strip():
    query += " AND (LOWER(c.title) LIKE :search OR LOWER(c.external_id) LIKE :search)"
    params["search"] = f"%{search_query.strip().lower()}%"
if plat_filter != "All":
    query += " AND p.name = :plat"
    params["plat"] = plat_filter
if type_filter != "All":
    query += " AND c.content_type = :ctype"
    params["ctype"] = type_filter
if lang_filter != "All":
    query += " AND c.language = :lang"
    params["lang"] = lang_filter

query += " ORDER BY c.published_at DESC NULLS LAST, c.id DESC LIMIT 100;"

with get_db_session() as session:
    res = session.execute(text(query), params)
    content_rows = res.fetchall()

if content_rows:
    df_content = pd.DataFrame(content_rows, columns=["ID", "Title", "Platform", "Type", "Language", "External ID", "Published At", "URL"])
    st.dataframe(df_content, use_container_width=True)

    st.divider()

    # Content Inspector & Edit Section
    st.subheader("Content Inspector & Metadata Editor")
    content_ids = [r.id for r in content_rows]
    selected_id = st.selectbox("Select content item to inspect", content_ids, format_func=lambda x: f"ID {x}: {next(r.Title for r in content_rows if r.ID == x)}")

    selected_item = next(r for r in content_rows if r.ID == selected_id)

    col_edit, col_history = st.columns([1, 1])

    with col_edit:
        st.markdown(f"**Edit Metadata for ID #{selected_item.ID}**")
        with st.form("edit_content_form"):
            new_title = st.text_input("Title", value=selected_item.Title)
            new_type = st.selectbox("Content Type", CONTENT_TYPES, index=CONTENT_TYPES.index(selected_item.Type) if selected_item.Type in CONTENT_TYPES else 0)
            
            lang_names = [l["name"] for l in SUPPORTED_LANGUAGES]
            current_lang_idx = lang_names.index(selected_item.Language) if selected_item.Language in lang_names else 0
            new_lang = st.selectbox("Language", lang_names, index=current_lang_idx)
            
            save_btn = st.form_submit_button("Save Metadata Updates", use_container_width=True)
            if save_btn:
                with get_db_session() as s:
                    item = s.get(Content, selected_item.ID)
                    if item:
                        item.title = new_title
                        item.content_type = new_type
                        item.language = new_lang
                        st.success("Metadata updated successfully!")
                        st.rerun()

        # Delete Action with Confirmation
        st.markdown("---")
        with st.expander("⚠️ Danger Zone: Delete Content Record"):
            st.warning("Deleting this content record will also delete all associated historical metric snapshots.")
            confirm = st.checkbox(f"Confirm deletion of '{selected_item.Title}'")
            if st.button("Delete Permanently", type="primary") and confirm:
                with get_db_session() as s:
                    item = s.get(Content, selected_item.ID)
                    if item:
                        s.delete(item)
                        st.success("Record deleted successfully.")
                        st.rerun()

    with col_history:
        st.markdown("**Historical Metric Snapshots**")
        with get_db_session() as s:
            history_query = """
            SELECT metric_name, metric_value, captured_at, created_at
            FROM metric_snapshots
            WHERE content_id = :cid
            ORDER BY captured_at DESC;
            """
            hist_res = s.execute(text(history_query), {"cid": selected_item.ID}).fetchall()

        if hist_res:
            hist_df = pd.DataFrame(hist_res, columns=["Metric", "Value", "Captured At", "Recorded At"])
            st.dataframe(hist_df, use_container_width=True)
        else:
            st.info("No metric snapshots recorded for this content item yet.")

else:
    st.info("No content records found matching your search and filter criteria.")

