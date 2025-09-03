"use client";
import React, { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Error caught by ErrorBoundary:", error, info);
  }

  handleReset() {
    this.setState({ hasError: false });
    if (typeof window !== "undefined") {
      window.location.reload(); // Optional: full page reload
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          <h1 className="text-lg font-semibold">⚠️ Something went wrong.</h1>
          <p className="text-sm mt-1">
            Please try again later or reload the page.
          </p>
          <button
            onClick={this.handleReset.bind(this)}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
