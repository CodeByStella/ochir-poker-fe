import toast from "react-hot-toast";

const success = (message: string) => {
  toast.success(message || "Хүсэлт амжилттай.", {
    style: {
      // border: "1px solid #333",
      borderRadius: "3px",
      padding: "8px 16px",
      color: "#333",
      minWidth: "280px",
    },
  });
};

const error = (message: string) => {
  toast.error(message || "Хүсэлт амжилтгүй.", {
    style: {
      // border: "1px solid #333",
      borderRadius: "3px",
      padding: "8px 16px",
      color: "#333",
      minWidth: "280px",
    },
  });
};

export const message = {
  success,
  error,
};
