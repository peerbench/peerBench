import { Component, type ReactNode } from "react";
import { Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Agents } from "./pages/Agents";
import { AgentDetail } from "./pages/AgentDetail";
import { Configs } from "./pages/Configs";
import { ConfigDetail } from "./pages/ConfigDetail";
import { Runs } from "./pages/Runs";
import { RunDetail } from "./pages/RunDetail";
import { ResultDetail } from "./pages/ResultDetail";
import { Triggers } from "./pages/Triggers";
import { Schemas } from "./pages/Schemas";
import { Scorers } from "./pages/Scorers";
import { Runners } from "./pages/Runners";
import { ConfigReference } from "./pages/ConfigReference";
import { Leaderboard } from "./pages/Leaderboard";
import { Admin } from "./pages/Admin";
import { Results } from "./pages/Results";
import { QuickTest } from "./pages/QuickTest";
import { NewConfig } from "./pages/NewConfig";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { queryClient } from "./lib/query-client";

class DevtoolsBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <>
        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          hideProgressBar
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          closeButton
          theme="light"
          limit={2}
          style={{ fontSize: "14px" }}
        />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/agents/:id" element={<AgentDetail />} />
            <Route path="/configs" element={<Configs />} />
            <Route path="/configs/new" element={<NewConfig />} />
            <Route path="/configs/:id" element={<ConfigDetail />} />
            <Route path="/runs" element={<Runs />} />
            <Route path="/runs/:id" element={<RunDetail />} />
            <Route path="/runs/:runId/results/:id" element={<ResultDetail />} />
            <Route path="/results" element={<Results />} />
            <Route path="/quick-test" element={<QuickTest />} />
            <Route path="/triggers" element={<Triggers />} />
            <Route path="/schemas" element={<Schemas />} />
            <Route path="/scorers" element={<Scorers />} />
            <Route path="/runners" element={<Runners />} />
            <Route
              path="/runners/leaderboard-per-runner"
              element={<Leaderboard />}
            />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/config-reference" element={<ConfigReference />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Routes>
      </>
      <DevtoolsBoundary>
        <ReactQueryDevtools initialIsOpen={false} />
      </DevtoolsBoundary>
    </QueryClientProvider>
  );
}
