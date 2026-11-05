"""Analytics Page: In-depth performance comparisons, release analysis, and trends."""

import streamlit as st
import pandas as pd
import plotly.express as px
from analytics.comparisons import compare_content_types, compare_languages
from analytics.metrics import get_latest_metrics_dataframe
from analytics.statistics import compute_distribution_stats

st.set_page_config(page_title="Analytics", page_icon="📈", layout="wide")

st.title("📈 Creator Analytics & Content Research")
st.markdown("Perform statistical comparisons across content formats, languages, releases, and platform vectors.")

st.divider()

tab_types, tab_langs, tab_stats = st.tabs(["🎵 Content Type Analysis", "🌐 Language Comparison", "📐 Statistical Distributions"])

with tab_types:
    st.subheader("Performance by Content Type")
    df_types = compare_content_types()
    if not df_types.empty:
        col_t1, col_t2 = st.columns([1, 1])
        with col_t1:
            st.dataframe(df_types, use_container_width=True)
        with col_t2:
            fig_types = px.bar(
                df_types,
                x="content_type",
                y="total_views",
                color="content_type",
                title="Total Views by Content Type",
                color_discrete_sequence=px.colors.qualitative.Bold,
            )
            fig_types.update_layout(template="plotly_dark", showlegend=False)
            st.plotly_chart(fig_types, use_container_width=True)
    else:
        st.info("No content type data available yet.")

with tab_langs:
    st.subheader("Performance Across Languages")
    st.caption("Compare how music releases and videos resonate across languages (Indonesian, English, Japanese, Javanese, Sundanese).")
    df_langs = compare_languages()
    if not df_langs.empty:
        col_l1, col_l2 = st.columns([1, 1])
        with col_l1:
            st.dataframe(df_langs, use_container_width=True)
        with col_l2:
            fig_langs = px.bar(
                df_langs,
                x="language",
                y="total_views",
                color="language",
                title="Total Views by Language",
                color_discrete_sequence=px.colors.qualitative.Pastel,
            )
            fig_langs.update_layout(template="plotly_dark", showlegend=False)
            st.plotly_chart(fig_langs, use_container_width=True)
    else:
        st.info("No language performance data available yet.")

with tab_stats:
    st.subheader("Descriptive Metrics & Variance Analysis")
    st.caption("Rigorous statistical metrics calculated only on actual recorded numbers, ignoring missing entries.")
    
    df_metrics = get_latest_metrics_dataframe()
    if not df_metrics.empty:
        views_s = df_metrics[df_metrics["metric_name"] == "views"]["metric_value"]
        likes_s = df_metrics[df_metrics["metric_name"] == "likes"]["metric_value"]

        st.markdown("**Views Statistics:**")
        st.json(compute_distribution_stats(views_s))

        st.markdown("**Likes Statistics:**")
        st.json(compute_distribution_stats(likes_s))
    else:
        st.info("No snapshot metrics available for statistical evaluation.")

