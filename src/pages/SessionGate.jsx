import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

// Get or create device token
const getUserId = () => {
  let userId = localStorage.getItem("user_id");
  if (!userId) {
    userId =
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36);
    localStorage.setItem("user_id", userId);
  }
  return userId;
};

export default function SessionGate() {
  const { sessionToken } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  useEffect(() => {
    const checkSession = async () => {
      const { data: session, error } = await supabase
        .from("sessions")
        .select("user_id")
        .eq("session_token", sessionToken)
        .single();

      if (error || !session) {
        navigate("/"); 
        return;
      }

      // Does current user match the session creator
      if (userId === session.user_id) {
        navigate("/create");
      } else {
        navigate(`/answer/${sessionToken}`);
      }

      setLoading(false);
    };

    checkSession();
  }, [sessionToken, navigate, userId]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-white">
        Loading session...
      </div>
    );
}
