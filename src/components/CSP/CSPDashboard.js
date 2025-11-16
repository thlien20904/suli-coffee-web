// frontend/src/components/CSP/CSPDashboard.js - CSP Dashboard Component
import React, { useState, useMemo } from "react";
import { useCSP } from "./CSPProvider";
import CSPAnalyzer from "./CSPAnalyzer";
import HashNonceDemo from "./HashNonceDemo";
import "./CSPDashboard.css";

const CSPDashboard = () => {
  const { violations, passes, connected } = useCSP();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [logTab, setLogTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;

  const allEvents = useMemo(() => {
    return [...violations, ...passes].sort((a, b) => {
      // Parse timestamp: either Date object or ISO string
      const timeA =
        a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const timeB =
        b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return timeB - timeA;
    });
  }, [violations, passes]);

  const renderMainDashboard = () => {
    return (
      <div className="main-dashboard">
        <div className="dashboard-header">
          <h1>🛡️ Content Security Policy Dashboard</h1>
          <div className="connection-status">
            <span
              className={`status-indicator ${
                connected ? "connected" : "disconnected"
              }`}
            >
              {connected ? "🟢 Connected" : "🔴 Disconnected"}
            </span>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card violations">
            <div className="stat-icon">🚫</div>
            <div className="stat-content">
              <h3>Violations</h3>
              <span className="stat-number">{violations.length}</span>
            </div>
          </div>
          <div className="stat-card passes">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>Passes</h3>
              <span className="stat-number">{passes.length}</span>
            </div>
          </div>
          <div className="stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Total Events</h3>
              <span className="stat-number">{allEvents.length}</span>
            </div>
          </div>
        </div>

        <div className="logs-section">
          <div className="logs-header">
            <h2>📋 Security Logs</h2>
            <div className="log-tabs">
              <button
                className={logTab === "all" ? "log-tab active" : "log-tab"}
                onClick={() => {
                  setLogTab("all");
                  setCurrentPage(1);
                }}
              >
                All ({allEvents.length})
              </button>
              <button
                className={
                  logTab === "violations" ? "log-tab active" : "log-tab"
                }
                onClick={() => {
                  setLogTab("violations");
                  setCurrentPage(1);
                }}
              >
                Violations ({violations.length})
              </button>
              <button
                className={logTab === "passes" ? "log-tab active" : "log-tab"}
                onClick={() => {
                  setLogTab("passes");
                  setCurrentPage(1);
                }}
              >
                Passes ({passes.length})
              </button>
            </div>
          </div>

          {/* Search Filter */}
          <div className="logs-filter">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Search by URI, directive, page..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="logs-container">{renderLogsWithPagination()}</div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "analyzer":
        return <CSPAnalyzer />;
      case "hash-nonce":
        return <HashNonceDemo />;
      default:
        return renderMainDashboard();
    }
  };

  // Format timestamp properly
  const formatTimestamp = (timestamp) => {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(date.getTime())) {
        return new Date().toLocaleString("vi-VN");
      }
      return date.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (e) {
      return new Date().toLocaleString("vi-VN");
    }
  };

  // Filter logs based on search query
  const filterLogs = (logs) => {
    if (!searchQuery) return logs;

    const query = searchQuery.toLowerCase();
    return logs.filter((log) => {
      const searchableText = JSON.stringify(log).toLowerCase();
      return searchableText.includes(query);
    });
  };

  // Get current logs with filtering and pagination
  const getCurrentLogs = () => {
    let logs =
      logTab === "all"
        ? allEvents
        : logTab === "violations"
        ? violations
        : passes;
    logs = filterLogs(logs);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return {
      logs: logs.slice(startIndex, endIndex),
      total: logs.length,
      totalPages: Math.ceil(logs.length / itemsPerPage),
    };
  };

  const renderLogsWithPagination = () => {
    const { logs, total, totalPages } = getCurrentLogs();

    if (total === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>{searchQuery ? "Không tìm thấy kết quả" : "Chưa có logs nào"}</p>
        </div>
      );
    }

    return (
      <>
        {logs.map((log, index) => {
          const isPass = log.status === "pass";
          const uniqueKey = log.id || `${log.timestamp}-${index}`;
          return (
            <div
              key={uniqueKey}
              className={`log-item ${isPass ? "pass" : "fail"}`}
            >
              <div className="log-header">
                <span className={`log-badge ${isPass ? "pass" : "fail"}`}>
                  {isPass ? "✅ PASS" : "🚫 VIOLATION"}
                </span>
                <span className="log-time">
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>
              <div className="log-details">
                {isPass ? (
                  <>
                    <div className="log-detail">
                      <span className="log-label">📄 Page:</span>
                      <span className="log-value">{log.page || "N/A"}</span>
                    </div>
                    <div className="log-detail">
                      <span className="log-label">🎯 Directive:</span>
                      <span className="log-value">
                        {log.directive || "N/A"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="log-detail">
                      <span className="log-label">📄 Document URI:</span>
                      <span className="log-value">
                        {log["document-uri"] || "N/A"}
                      </span>
                    </div>
                    <div className="log-detail">
                      <span className="log-label">⚠️ Violated Directive:</span>
                      <span className="log-value">
                        {log["violated-directive"] ||
                          log["effective-directive"] ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="log-detail">
                      <span className="log-label">🚫 Blocked URI:</span>
                      <span className="log-value">
                        {log["blocked-uri"] || "inline"}
                      </span>
                    </div>
                    {log["source-file"] && (
                      <div className="log-detail">
                        <span className="log-label">📁 Source File:</span>
                        <span className="log-value">{log["source-file"]}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ← Prev
            </button>

            <div className="page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => {
                  // Show first, last, current, and adjacent pages
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        className={`page-number ${
                          currentPage === page ? "active" : ""
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <span key={page} className="page-ellipsis">
                        ...
                      </span>
                    );
                  }
                  return null;
                }
              )}
            </div>

            <button
              className="page-btn"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
            >
              Next →
            </button>

            <span className="page-info">
              Page {currentPage} of {totalPages} ({total} items)
            </span>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="csp-dashboard">
      <nav className="csp-nav">
        <div className="nav-tabs">
          <button
            className={activeTab === "dashboard" ? "nav-tab active" : "nav-tab"}
            onClick={() => setActiveTab("dashboard")}
          >
            📊 Dashboard
          </button>
          <button
            className={activeTab === "analyzer" ? "nav-tab active" : "nav-tab"}
            onClick={() => setActiveTab("analyzer")}
          >
            🔍 Analyzer
          </button>
          <button
            className={
              activeTab === "hash-nonce" ? "nav-tab active" : "nav-tab"
            }
            onClick={() => setActiveTab("hash-nonce")}
          >
            🔐 Hash & Nonce
          </button>
        </div>
      </nav>

      {renderContent()}
    </div>
  );
};

export default CSPDashboard;
