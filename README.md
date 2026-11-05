# Creator Analytics Lab 🎙️📊

**Creator Analytics Lab** is a personal, multi-platform creator analytics and research platform designed to collect, organize, visualize, and analyze creator performance data.

Built specifically for an independent music creator, singer, music producer, VTuber, and multi-platform publisher to understand actual content performance, identify trends, compare song releases and covers, and conduct data-backed research without relying on generic social media dashboards or fake metrics.

---

## 🛠️ Technology Stack

- **Language:** Python 3.12+
- **Web Framework:** [Streamlit](https://streamlit.io/)
- **Database:** [Neon PostgreSQL](https://neon.tech/) (Lakebase serverless Postgres)
- **Database Connectivity:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/) + [psycopg3](https://www.psycopg.org/) (binary driver)
- **Data Processing:** [Pandas](https://pandas.pydata.org/) & [NumPy](https://numpy.org/)
- **Data Visualization:** [Plotly](https://plotly.com/python/) (dark-mode first, interactive charts)
- **Testing:** [Pytest](https://pytest.org/)
- **Environment Management:** [python-dotenv](https://github.com/theskumar/python-dotenv) & Streamlit Secrets

---

## 📁 Project Structure

```
Creator Analytics Tab/
├── app.py                      # Main Streamlit application entry point & navigation
├── requirements.txt            # Python dependencies
├── README.md                   # Project documentation & setup instructions
├── .env.example                # Example environment variable template
├── .gitignore                  # Git ignore rules (secrets, venv, cache)
│
├── pages/                      # Multi-page application modules
│   ├── dashboard.py            # Overview dashboard (KPIs, platform & content breakdowns)
│   ├── content.py              # Content catalog (search, filter, metadata edit, delete)
│   ├── analytics.py            # Content-type analysis, language comparisons, statistics
│   ├── reports.py              # Custom report builder & CSV export
│   ├── data_import.py          # CSV data uploader, validator, and import history
│   └── system_status.py        # Neon database health check & schema inspection
│
├── core/                       # Core system & database logic
│   ├── __init__.py
│   ├── config.py               # Environment variable loading & URL normalization
│   ├── database.py             # SQLAlchemy models, engine singleton, connection test
│   ├── cleaner.py              # Data cleaning, UTC datetime parsing, numeric parsing
│   ├── validators.py           # Content and metric validation rules
│   └── importer.py             # Platform-specific adapters (YouTube, TikTok, Spotify)
│
├── analytics/                  # Analytical calculations & statistical modeling
│   ├── __init__.py
│   ├── metrics.py              # Engagement rates & platform summaries
│   ├── comparisons.py          # Content type and language performance comparisons
│   └── statistics.py           # Descriptive statistics (mean, median, std, percentiles)
│
├── tests/                      # Automated test suite
│   ├── __init__.py
│   ├── test_database.py        # Connection tests & URL sanitization tests
│   ├── test_importer.py        # Adapter parsing & type cleaner tests
│   ├── test_metrics.py         # Engagement rate & growth calculation tests
│   └── test_validators.py      # Schema & metric constraint validation tests
│
├── data/                       # Demonstration and test data directory
│   ├── .gitkeep
│   ├── sample_youtube_demonstration.csv # Synthetic YouTube sample export
│   └── sample_tiktok_demonstration.csv  # Synthetic TikTok sample export
│
└── .streamlit/
    └── config.toml             # Dark-mode-first aesthetic & server configuration
```

---

## 🗄️ Database Architecture (Neon PostgreSQL)

All persistent application data is stored in **Neon PostgreSQL**.

### Schema Entities

1. **`platforms`**: Supported creator platforms (`YouTube`, `TikTok`, `Spotify`, `Instagram`, `Apple Music`).
2. **`contents`**: Published works (music covers, original songs, short-form clips, long-form videos, live streams).
   - Enforces unique constraint `(platform_id, external_id)` to prevent duplicate entries.
   - Preserves content language (Indonesian, English, Japanese, Javanese, Sundanese, Multilingual, etc.).
3. **`metric_snapshots`**: Point-in-time performance observations (views, likes, comments, shares, watch time, streams).
   - Enforces unique constraint `(content_id, metric_name, captured_at)` to support timeline comparisons without duplicate entries.
4. **`import_history`**: Audit trail of all dataset ingestions (filename, platform, imported rows, rejected rows, error summary).

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- A Neon PostgreSQL project connection string

### 2. Clone and Setup Environment

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# Install required dependencies
pip install -r requirements.txt
```

### 3. Configure Database Credentials

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your Neon connection URL in `.env`:
```env
DATABASE_URL=postgresql://[user]:[password]@[neon_hostname]/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://[user]:[password]@[neon_hostname]/neondb?sslmode=require
```

> **Security Note:** Never commit `.env` or credentials to version control. The repository `.gitignore` automatically excludes `.env` and `.env.local`.

### 4. Initialize Database Schema

You can initialize the schema either through Python or via the UI:

**Via Python:**
```bash
python -c "from core.database import init_db; print(init_db())"
```

**Via Streamlit UI:**
Navigate to the **System & Database** page and click **"Initialize / Verify Schema"**.

---

## 🧪 Running Tests

The test suite validates data cleaning, schema constraints, platform adapters, metric calculations, and database connectivity:

```bash
pytest
```

---

## 🖥️ Running the Application

Launch the Streamlit web app:

```bash
streamlit run app.py
```

Open your browser at `http://localhost:8501`.

### Features Available in Phase 1:
- **Live Connection Indicator:** Sidebar displays live Neon database status and latency in milliseconds.
- **Overview Dashboard:** Total catalog count, verified views/likes/comments, and platform breakdowns.
- **Content Management:** Search and filter content, edit titles/types/languages, and inspect metric history.
- **Analytics & Research:** Compare views and engagement across content types and languages with descriptive statistics.
- **Reports & Export:** Custom filtered reports exported directly to CSV.
- **Data Import:** Upload platform CSV exports (YouTube Studio, TikTok Analytics, etc.) with automatic header matching, duplicate validation, and atomic database persistence.
- **System Status:** View Neon connection latency, database version, and live table counts.
