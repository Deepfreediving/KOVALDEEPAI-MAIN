import "../styles/globals.css"; // Importing global styles
import { useEffect, useState } from "react"; // React hooks for side effects and state management
import ErrorBoundary from "../components/ErrorBoundary"; // Import the ErrorBoundary component

function MyApp({ Component, pageProps }) {
  const [isLoaded, setIsLoaded] = useState(false); // Local state for handling loading

  useEffect(() => {
    setIsLoaded(true); // Ensure app is loaded properly
  }, []);

  // If the app is not yet loaded, display a loading screen
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    // Wrap the app in the ErrorBoundary for global error handling
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

export default MyApp;
