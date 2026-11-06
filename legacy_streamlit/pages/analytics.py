"""Analytics Page: In-depth performance comparisons, release analysis, and statistical research."""

import streamlit as st
import pandas as pd
import plotly.express as px

from analytics.comparisons import (
    compare_content_types,
    compare_languages,
    compare_original_vs_covers,
)
from analytics.metrics import get_latest_metrics_dataframe, compute_engagement_rate
from analytics.statistics import compute_distribution_stats

st.set_page_config(page_title="Analytics & Research", page_icon="📈", layout="wide")

st.title("📈 Creator Analytics & Content Research")
st.markdown("Perform statistical comparisons across content formats, music releases, languages, and audience metrics.")

st.divider()

tab_types, tab_music, tab_langs, tab_scatter, tab_stats = st.tabs([
    "🎵 Content Types",
    "💿 Originals vs Covers",
    "🌐 Language Comparison",
    "🔬 Performance Scatter & Engagement",
    "📐 Statistical Distributions",
])

# TAB 1: CONTENT TYPE ANALYSIS
with tab_types:
    st.subheader("Performance Across Content Formats")
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
                title="Total Views by Content Format",
                color_discrete_sequence=px.colors.qualitative.Bold,
            )
            fig_types.update_layout(template="plotly_dark", showlegend=False)
            st.plotly_chart(fig_types, use_container_width=True)
    else:
        st.info("No content type data available yet.")

# TAB 2: ORIGINALS VS COVERS
with tab_music:
    st.subheader("Music Production Analysis: Originals vs. Covers")
    st.caption("Evaluate how original compositions perform against cover song releases.")
    df_music = compare_original_vs_covers()
    if not df_music.empty:
        m_col1, m_col2 = st.columns([1, 1])
        with m_col1:
            st.dataframe(df_music, use_container_width=True)
        with m_col2:
            fig_music = px.bar(
                df_music,
                x="release_category",
                y="avg_views",
                color="release_category",
                title="Average Views per Release",
                color_discrete_sequence=["#00E599", "#6F42C1", "#0D6EFD"],
            )
            fig_music.update_layout(template="plotly_dark", showlegend=False)
            st.plotly_chart(fig_music, use_container_width=True)
    else:
        st.info("No music release records available yet. Tag items as 'original_song' or 'music_cover' to populate this analysis.")

# TAB 3: LANGUAGE COMPARISON
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

# TAB 4: SCATTER & ENGAGEMENT ANALYSIS
with tab_scatter:
    st.subheader("Correlation & Engagement Distribution")
    raw_df = get_latest_metrics_dataframe()
    if not raw_df.empty:
        # Pivot to get views and likes per content
        piv = raw_df.pivot_table(
            index=["content_id", "title", "platform_name", "content_type"],
            columns="metric_name",
            values="metric_value",
            aggfunc="first",
        ).reset_index()

        if "views" in piv.columns and "likes" in piv.columns:
            piv["engagement_rate_%"] = piv.apply(
                lambda r: compute_engagement_rate(r.get("views"), r.get("likes")), axis=1
            )
            valid_scatter = piv.dropna(subset=["views", "likes"])
            if not valid_scatter.empty:
                fig_scatter = px.scatter(
                    valid_scatter,
                    x="views",
                    y="likes",
                    size="likes",
                    color="content_type",
                    hover_name="title",
                    title="Content Correlation: Views vs. Likes",
                    color_discrete_sequence=px.colors.qualitative.Plotly,
                )
                fig_scatter.update_layout(template="plotly_dark")
                st.plotly_chart(fig_scatter, use_container_width=True)

                st.markdown("**Engagement Rate Leaderboard:**")
                st.dataframe(
                    valid_scatter[["title", "platform_name", "content_type", "views", "likes", "engagement_rate_%"]]
                    .sort_values(by="engagement_rate_%", ascending=False)
                    .head(10),
                    use_container_width=True,
                )
            else:
                st.info("Not enough pairs of views and likes data to plot.")
        else:
            st.info("Requires both 'views' and 'likes' metrics to render correlation scatter.")
    else:
        st.info("No content data available for correlation analysis.")

# TAB 5: STATISTICAL DISTRIBUTIONS
with tab_stats:
    st.subheader("Descriptive Statistics & Variance")
    st.caption("Rigorous parametric and non-parametric statistics calculated strictly on actual observations.")

    df_metrics = get_latest_metrics_dataframe()
    if not df_metrics.empty:
        col_s1, col_s2 = st.columns(2)
        with col_s1:
            views_s = df_metrics[df_metrics["metric_name"] == "views"]["metric_value"]
            st.markdown("#### 👁️ Views Distribution")
            v_stats = compute_distribution_stats(views_s)
            st.json(v_stats)

        with col_s2:
            likes_s = df_metrics[df_metrics["metric_name"] == "likes"]["metric_value"]
            st.markdown("#### ❤️ Likes Distribution")
            l_stats = compute_distribution_stats(likes_s)
            st.json(l_stats)
    else:
        st.info("No snapshot metrics available for statistical evaluation.")
