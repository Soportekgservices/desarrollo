const { createClient } = supabase;
const _s = createClient('https://lllrnkzhwudnfbrxciqb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsbHJua3pod3VkbmZicnhjaXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTEwMzQsImV4cCI6MjA5MTU4NzAzNH0.MwuXJnxwJJtPejJmxQljwvEmmcOw9FzYa_5w7cKYSM0');

// Registrar Chart.js plugins
Chart.register(ChartDataLabels);