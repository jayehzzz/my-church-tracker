# ⛪ My Church Tracker

![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)

> **A modern, data-driven dashboard for tracking church health, member engagement, and community impact.**

---

## ✨ Overview

**My Church Tracker** is a premium, high-performance web application designed to help church leaders visualise and manage their community data. Built with **SvelteKit** and **Tailwind CSS**, it offers a sleek, dark-mode-first interface that makes complex data intuitive and actionable.

Gone are the days of clunky spreadsheets. This tracker provides real-time insights into attendance, salvation decisions, evangelism efforts, and member care.

## 🚀 Key Features

### 👥 **Smart People Directory**
*   **Rich Profiles:** detailed member view with attendance history and engagement metrics.
*   **Advanced Filtering:** Filter by spiritual status, join date, age group, and more.
*   **Interactive Analytics:** Visualise growth trends and demographic breakdowns instantly.

### 📊 **Dynamic Dashboards**
*   **Service Tracking:** Monitor attendance trends, guest retention, and service type distribution.
*   **Evangelism Metrics:** Track outreach impact, salvation decisions, and top inviters.
*   **Visitation Logs:** Keep track of pastoral care visits and follow-ups with a dedicated calendar view.

### 🎨 **Premium UX/UI**
*   **Dark Mode Native:** Designed for focus and visual comfort.
*   **Smooth Animations:** Fluid transitions and interactive charts using Recharts and Framer Motion concepts.
*   **Mobile Responsive:** Fully functional on tablets and desktops.

---

## 🛠️ Technology Stack

This project leverages the bleeding edge of web development:

*   **Framework:** [SvelteKit](https://kit.svelte.dev/) (Svelte 5 Runes)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Charts:** [Recharts](https://recharts.org/) / Custom SVG Components
*   **Icons:** [Lucide Icons](https://lucide.dev/)
*   **Backend:** [Supabase](https://supabase.com/) (PostgreSQL)

---

## ⚡ Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites
*   Node.js (v18 or higher)
*   Git

### 1. Clone the repository
```bash
git clone https://github.com/jayehzzz/my-church-tracker.git
cd my-church-tracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the development server
```bash
npm run dev
```

Visit `http://localhost:5173` in your browser to see the app running!

---

## 📂 Project Structure

```bash
src/
├── lib/
│   ├── components/   # Reusable UI components (Charts, Cards, Filters)
│   ├── services/     # Data fetching and business logic
│   └── stores/       # Global state management
├── routes/
│   ├── people/       # Directory & Profile pages
│   ├── services/     # Service tracking dashboard
│   ├── evangelism/   # Outreach & salvation stats
│   └── matches/      # Visitation & Care
└── app.css           # Global styles & Design Tokens
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

<p align="center">
  Built with ❤️ for the Kingdom.
</p>
