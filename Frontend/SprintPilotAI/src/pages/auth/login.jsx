import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import BrandHeader from "../../components/login/ BrandHeader";
import ErrorAlert from "../../components/login/ErrorAlert";
import GoogleButtonSkeleton from "../../components/login/GoogleButtonSkeleton";
import LoginIllustration from "../../components/login/LoginIllustration";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const btnContainerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      navigate("/dashboard");
      return;
    }

    window.handleGoogleCredentialResponse = async (response) => {
      setLoading(true);
      setError(null);
      try {
        const idToken = response.credential;
        await login(idToken);
        navigate("/dashboard");
      } catch (err) {
        console.error("[auth] Google auth error caught:", err);
        let errorMsg = "Authentication failed. Please contact your administrator.";
        
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMsg = err.response?.data?.detail || err.response?.data?.error || err.response?.data?.message || errorMsg;
        } else if (err.request) {
          // The request was made but no response was received
          errorMsg = "Network error. Please check your connection and try again.";
        } else {
          // Something happened in setting up the request that triggered an Error
          errorMsg = err.message || errorMsg;
        }
        
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    const scriptId = "google-gsi-script";
    let attempts = 0;
    let retryTimer = null;

    const tryRenderButton = () => {
      attempts += 1;
      const container = document.getElementById("google-signin-btn");

      if (window.google?.accounts?.id && container) {
        try {
          container.innerHTML = "";
          window.google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            width: 320,
            text: "continue_with",
            shape: "pill",
          });
          setGoogleReady(true);
          console.log("[auth] Google button rendered successfully");
          return;
        } catch (err) {
          console.error("[auth] Error rendering Google button:", err);
        }
      }

      if (attempts < 20) {
        retryTimer = setTimeout(tryRenderButton, 250);
      } else {
        console.error("[auth] Gave up waiting for Google button to render");
        setError("Google Sign-In could not load. Please refresh the page.");
      }
    };

    const initGoogleSDK = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(initGoogleSDK, 100);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: window.handleGoogleCredentialResponse,
      });
      tryRenderButton();
    };

    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogleSDK;
      script.onerror = () => {
        console.error("[auth] Failed to load Google SDK");
        setError("Failed to load Google Sign-In. Please refresh the page.");
      };
      document.head.appendChild(script);
    } else if (window.google?.accounts?.id) {
      initGoogleSDK();
    } else {
      script.addEventListener("load", initGoogleSDK, { once: true });
    }

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [navigate]);

  const handleFallbackClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: "#F6F5F2" }}
    >
      <div
        className="w-full max-w-5xl bg-white rounded-3xl shadow-lg overflow-hidden"
        style={{ border: "1px solid #ECEBE7" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
          <div className="flex flex-col justify-evenly p-6 sm:p-8 md:p-12 lg:p-14">
            <div className="flex flex-col">
              <BrandHeader />

              {/* Heading */}
              <div className="mb-6 sm:mb-8">
                <div
                  className="text-xs sm:text-sm font-bold mb-2"
                  style={{ color: "#E8481F" }}
                >
                  WELCOME BACK
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-bold leading-tight"
                  style={{ color: "#14151A" }}
                >
                  Ready to conquer
                  <br />
                  your projects? <span className="inline-block">👋</span>
                </h1>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <ErrorAlert error={error} />

              <div className="min-h-[50px] flex flex-col items-center gap-3">
                {loading ? (
                  <div
                    className="flex items-center gap-2 text-sm py-3"
                    style={{ color: "#6B6E76" }}
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <>
                    <div
                      id="google-signin-btn"
                      ref={btnContainerRef}
                      className="min-h-[44px]"
                    />

                    {!googleReady && (
                      <GoogleButtonSkeleton onClick={handleFallbackClick} />
                    )}
                  </>
                )}
              </div>

              <p
                className="text-xs text-center"
                style={{ color: "#6B6E76", marginTop: "1rem" }}
              >
                New to SprintPilotAI? Signing in with Google creates your
                account automatically.
              </p>
            </div>
          </div>

          <LoginIllustration />
        </div>
      </div>
    </div>
  );
}
