# Portfolio Tracker 📈

A modern, full-stack stock portfolio tracker that provides real-time market data, technical indicator predictions (RSI), and beautifully animated allocation charts. 

Built with a Python **Flask** backend and a sleek, responsive **Vanilla JS + CSS** frontend featuring a premium "Midnight Neon" glassmorphism UI.

## ✨ Features

- **Secure Authentication**: User registration and login system with encrypted passwords using Flask-Login.
- **Real-Time Data**: Live portfolio valuation, P&L calculations, and background auto-refresh polling powered by the Finnhub API.
- **Advanced Charting**: 
  - Dynamic Asset Allocation Doughnut Chart with exact percentage tooltips.
  - 6-Month Historical Price Line Chart featuring a high-frequency live-ticker simulation.
- **Predictive Analytics**: 
  - Real-time RSI (Relative Strength Index) calculation offering automated BUY/SELL/NEUTRAL signals.
  - 5-Year Portfolio Projection modeling based on historical market averages.
- **Vercel Ready**: Architected for serverless deployments with automatic detection between local SQLite and cloud PostgreSQL databases.

## 🛠️ Tech Stack

- **Backend**: Python, Flask, SQLAlchemy, Werkzeug, Pandas, Numpy
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charting**: Chart.js
- **Database**: SQLite (Local Development) / PostgreSQL (Production)
- **External API**: Finnhub (Stock Quotes & Candles)

## 🚀 Local Development Setup

1. **Clone the repository**
2. **Install dependencies**
   Make sure you have Python 3 installed. Run:
   ```bash
   pip install -r requirements.txt
   ```
3. **Run the Flask Server**
   ```bash
   python app.py
   ```
4. **Open the App**
   Navigate to `http://localhost:5000` in your web browser. 
5. **Add API Key**
   Create an account and click the settings icon in the top right of the dashboard to enter your free [Finnhub API Key](https://finnhub.io/).

## ☁️ Vercel Deployment

This project is fully configured for deployment on Vercel Serverless Functions.

1. Push your code to a GitHub repository.
2. Log into [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository. Vercel will automatically detect the Python configuration via `vercel.json`.
4. **Important**: Because Vercel uses an ephemeral filesystem, you *cannot* use the local SQLite database. 
   - In your Vercel Project Dashboard, go to **Storage** and create a new **Vercel Postgres** database.
   - Link it to your project. Vercel will automatically expose the `POSTGRES_URL` environment variable.
5. Hit **Deploy**! The app will intelligently switch to PostgreSQL in production.

## ⚙️ Environment Variables

- `SECRET_KEY`: (Optional) Used for Flask session security. Defaults to a dev string if not set.
- `POSTGRES_URL`: (Production Only) The connection string to your PostgreSQL database. If omitted, the app gracefully falls back to a local `portfolio.db` SQLite file.
