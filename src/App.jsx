import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");

  const [patient, setPatient] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [report, setReport] = useState(null);

  const [profileFile, setProfileFile] = useState(null);
  const [reportFile, setReportFile] = useState(null);

  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);

  // ------------------------------------------
  // CHECK LOGIN SESSION
  // ------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ------------------------------------------
  // LOAD PATIENT DATA
  // ------------------------------------------
  useEffect(() => {
    if (!session?.user) return;

    loadPatientData(session.user.id);
  }, [session]);

  async function loadPatientData(userId) {
    setLoading(true);

    try {
      // Patient profile
      const { data: patientData, error: patientError } = await supabase
        .from("patient_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (patientError) throw patientError;

      setPatient(patientData);

      // Appointment
      const { data: appointmentData, error: appointmentError } =
        await supabase
          .from("appointments")
          .select("*")
          .eq("user_id", userId)
          .order("appointment_date", { ascending: true })
          .limit(1)
          .maybeSingle();

      if (appointmentError) throw appointmentError;

      setAppointment(appointmentData);

      // Diagnostic report
      const { data: reportData, error: reportError } = await supabase
        .from("diagnostic_reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reportError) throw reportError;

      setReport(reportData);
    } catch (error) {
      console.error("Dashboard loading error:", error);
      setMessage(error.message || "Unable to load patient information.");
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------
  // LOGIN / SIGNUP
  // ------------------------------------------
  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const {
          data: { user },
          error,
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (error) throw error;

        if (user) {
          await supabase.from("patient_profiles").upsert(
            {
              user_id: user.id,
              patient_code:
                "PAT-" + user.id.replaceAll("-", "").substring(0, 8).toUpperCase(),
              full_name: name,
            },
            {
              onConflict: "user_id",
            }
          );
        }

        setMessage(
          "Account created successfully. Please check your email if confirmation is required."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage("Login successful.");
      }
    } catch (error) {
      setMessage(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------
  // LOGOUT
  // ------------------------------------------
  async function handleLogout() {
    await supabase.auth.signOut();

    setSession(null);
    setPatient(null);
    setAppointment(null);
    setReport(null);
    setMessage("");
  }

  // ------------------------------------------
  // PROFILE IMAGE UPLOAD
  // ------------------------------------------
  async function uploadProfilePicture() {
    if (!profileFile || !session?.user) return;

    setUploadingProfile(true);
    setMessage("");

    try {
      const userId = session.user.id;

      const fileExt = profileFile.name.split(".").pop();
      const fileName = `profile-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/profile/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("customer-images")
        .upload(filePath, profileFile, {
          upsert: true,
          contentType: profileFile.type,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("customer-images")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("patient_profiles")
        .update({
          profile_picture_url: publicUrl,
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setPatient((current) => ({
        ...current,
        profile_picture_url: publicUrl,
      }));

      setProfileFile(null);
      setMessage("Profile picture updated successfully.");
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Profile upload failed.");
    } finally {
      setUploadingProfile(false);
    }
  }

  // ------------------------------------------
  // DIAGNOSTIC IMAGE UPLOAD
  // ------------------------------------------
  async function uploadDiagnosticImage() {
    if (!reportFile || !session?.user) return;

    setUploadingReport(true);
    setMessage("");

    try {
      const userId = session.user.id;

      const fileExt = reportFile.name.split(".").pop();
      const fileName = `diagnostic-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("customer-images")
        .upload(filePath, reportFile, {
          upsert: true,
          contentType: reportFile.type,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("customer-images")
        .getPublicUrl(filePath);

      if (report) {
        const { data, error } = await supabase
          .from("diagnostic_reports")
          .update({
            uploaded_image_url: publicUrl,
          })
          .eq("id", report.id)
          .select()
          .single();

        if (error) throw error;

        setReport(data);
      } else {
        const { data, error } = await supabase
          .from("diagnostic_reports")
          .insert({
            user_id: userId,
            report_code:
              "RPT-" +
              userId.replaceAll("-", "").substring(0, 8).toUpperCase(),
            test_name: "Diagnostic Image",
            result_status: "Uploaded",
            uploaded_image_url: publicUrl,
            notes: "Image uploaded by patient.",
          })
          .select()
          .single();

        if (error) throw error;

        setReport(data);
      }

      setReportFile(null);
      setMessage("Diagnostic image uploaded successfully.");
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Diagnostic upload failed.");
    } finally {
      setUploadingReport(false);
    }
  }

  // ------------------------------------------
  // LOADING
  // ------------------------------------------
  if (loading) {
    return (
      <main className="auth-page">
        <section className="auth-card loading-card">
          <div className="brand-icon">C</div>
          <h2>Loading Patient Portal...</h2>
          <p>Please wait while we load your information.</p>
        </section>
      </main>
    );
  }

  // ------------------------------------------
  // LOGIN SCREEN
  // ------------------------------------------
  if (!session) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-icon">C</div>

          <p className="eyebrow">CUSTOMER PORTAL</p>

          <h1>
            {mode === "login"
              ? "Welcome back"
              : "Create your account"}
          </h1>

          <p className="subtitle">
            {mode === "login"
              ? "Log in to access your diagnostic account."
              : "Create your patient account to get started."}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Log in
            </button>

            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <label>
                Full name
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </label>
            )}

            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </label>

            <button
              className="submit-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Log in"
                  : "Create account"}
            </button>
          </form>

          {message && (
            <p className="message" role="status">
              {message}
            </p>
          )}

          <p className="security-note">
            Secure authentication powered by Supabase
          </p>
        </section>
      </main>
    );
  }

  // ------------------------------------------
  // PATIENT DASHBOARD
  // ------------------------------------------
const appointmentStatusSteps = [
  {
    key: "Scheduled",
    title: "Appointment Scheduled",
    description: "Your diagnostic appointment has been scheduled.",
  },
  {
    key: "Confirmed",
    title: "Appointment Confirmed",
    description: "Diagnostic center has confirmed your appointment.",
  },
  {
    key: "Sample Collection",
    title: "Sample Collection",
    description: "Sample collection will happen at the center.",
  },
  {
    key: "Processing",
    title: "Report Processing",
    description: "Your diagnostic report is being processed.",
  },
  {
    key: "Ready",
    title: "Report Ready",
    description: "Your diagnostic report is available.",
  },
];

const getAppointmentStep = (status) => {
  const normalizedStatus = String(status || "").toLowerCase().trim();

  const statusMap = {
    scheduled: 0,
    confirmed: 1,
    "sample collection": 2,
    processing: 3,
    ready: 4,
  };

  return statusMap[normalizedStatus] ?? 0;
};

const currentAppointmentStep = getAppointmentStep(
  appointment?.status
);


  const displayName =
    patient?.full_name ||
    session.user.user_metadata?.full_name ||
    "Patient";

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">

        {/* HEADER */}
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">DIAGNOSTICS PORTAL</p>
            <h1>Welcome, {displayName}</h1>
            <p className="dashboard-subtitle">
              Manage your appointments, reports and diagnostic documents.
            </p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </header>

        {/* MESSAGE */}
        {message && (
          <div className="dashboard-message">
            {message}
          </div>
        )}

        {/* TOP CARDS */}
        <section className="dashboard-grid">

          {/* PATIENT */}
          <div className="dashboard-card profile-card">
            <div className="card-header">
              <div>
                <span className="card-label">PATIENT PROFILE</span>
                <h2>Patient Details</h2>
              </div>

              {patient?.profile_picture_url ? (
                <img
                  className="profile-avatar"
                  src={patient.profile_picture_url}
                  alt="Patient profile"
                />
              ) : (
                <div className="profile-avatar placeholder-avatar">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="patient-details">
              <p>
                <strong>Patient ID</strong>
                <span>{patient?.patient_code || "Not assigned"}</span>
              </p>

              <p>
                <strong>Name</strong>
                <span>{patient?.full_name || displayName}</span>
              </p>

              <p>
                <strong>Email</strong>
                <span>{session.user.email}</span>
              </p>

              <p>
                <strong>Blood Group</strong>
                <span>{patient?.blood_group || "Not provided"}</span>
              </p>
            </div>

            <div className="upload-box">
              <h3>Profile Picture</h3>

              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setProfileFile(event.target.files?.[0] || null)
                }
              />

              <button
                className="secondary-button"
                onClick={uploadProfilePicture}
                disabled={!profileFile || uploadingProfile}
              >
                {uploadingProfile
                  ? "Uploading..."
                  : "Upload Profile Picture"}
              </button>
            </div>
          </div>

          {/* APPOINTMENT */}
          <div className="dashboard-card appointment-card">
            <span className="card-label">UPCOMING APPOINTMENT</span>
            <h2>Diagnostic Appointment</h2>

            {appointment ? (
              <>
                <div className="appointment-test">
                  🧪 {appointment.test_name}
                </div>

                <div className="appointment-info">
                  <p>
                    <strong>Date</strong>
                    <span>{appointment.appointment_date}</span>
                  </p>

                  <p>
                    <strong>Time</strong>
                    <span>{appointment.appointment_time}</span>
                  </p>

                  <p>
                    <strong>Center</strong>
                    <span>{appointment.diagnostic_center}</span>
                  </p>

                  <p>
                    <strong>Doctor</strong>
                    <span>{appointment.doctor_name}</span>
                  </p>
                </div>
<div className="appointment-timeline">
  <div className="timeline-title">
    Appointment Status
  </div>

  {appointmentStatusSteps.map((step, index) => {
    const isCompleted = index <= currentAppointmentStep;
    const isCurrent = index === currentAppointmentStep;

    return (
      <React.Fragment key={step.key}>
        <div
          className={`timeline-step ${
            isCompleted ? "active" : ""
          } ${isCurrent ? "current" : ""}`}
        >
          <span className="timeline-dot">
            {isCompleted ? "✓" : index + 1}
          </span>

          <div>
            <strong>{step.title}</strong>
            <small>{step.description}</small>
          </div>
        </div>

        {index < appointmentStatusSteps.length - 1 && (
          <div
            className={`timeline-line ${
              index < currentAppointmentStep ? "completed" : ""
            }`}
          ></div>
        )}
      </React.Fragment>
    );
  })}
</div>
              </>
            ) : (
              <p>No upcoming appointment found.</p>
            )}
          </div>
        </section>

        {/* REPORT SECTION */}
        <section className="dashboard-card report-section">
          <div className="card-header">
            <div>
              <span className="card-label">DIAGNOSTIC REPORTS</span>
              <h2>Reports & Documents</h2>
            </div>

            <span className="report-status">
              {report?.result_status || "No report"}
            </span>
          </div>

          {report ? (
            <div className="report-content">

              <div className="report-details">
                <p>
                  <strong>Report ID</strong>
                  <span>{report.report_code}</span>
                </p>

                <p>
                  <strong>Test</strong>
                  <span>{report.test_name}</span>
                </p>

                <p>
                  <strong>Report Date</strong>
                  <span>{report.report_date}</span>
                </p>

                <p>
                  <strong>Status</strong>
                  <span>{report.result_status}</span>
                </p>
              </div>

              {report.uploaded_image_url && (
                <div className="uploaded-preview">
                  <p>Uploaded Diagnostic Image</p>

                  <img
                    src={report.uploaded_image_url}
                    alt="Diagnostic upload"
                  />

                  <a
                    href={report.uploaded_image_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open full image
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p>
              No diagnostic report is available yet.
            </p>
          )}

          {/* UPLOAD */}
          <div className="report-upload">
            <h3>Upload Diagnostic Image / Document</h3>

            <p>
              Upload a scan, prescription, diagnostic image or supporting
              document.
            </p>

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(event) =>
                setReportFile(event.target.files?.[0] || null)
              }
            />

            <button
              className="submit-button upload-button"
              onClick={uploadDiagnosticImage}
              disabled={!reportFile || uploadingReport}
            >
              {uploadingReport
                ? "Uploading..."
                : "Upload Diagnostic File"}
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="dashboard-footer">
          <span>Diagnostics Appointment & Reporting System</span>
          <span>Patient Portal • Demo Version</span>
        </footer>

      </div>
    </main>
  );



}

export default App;