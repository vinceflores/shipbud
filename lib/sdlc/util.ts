export const getSessionId = () => {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("req_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("req_session_id", id);
  }
  return id;
};