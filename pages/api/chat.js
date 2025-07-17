useEffect(() => {
  const storedThreadId = localStorage.getItem("kovalThreadId");
  const storedUsername = localStorage.getItem("kovalUser");

  console.log("Stored threadId:", storedThreadId);
  console.log("Stored username:", storedUsername);

  if (!storedUsername) {
    const name = prompt("Please enter your name for a personalized experience:");
    if (name) {
      localStorage.setItem("kovalUser", name);
      setUsername(name);
    } else {
      const newUser = "Guest" + Math.floor(Math.random() * 1000);
      localStorage.setItem("kovalUser", newUser);
      setUsername(newUser);
    }
  } else {
    setUsername(storedUsername);
  }

  if (!storedThreadId) {
    const createThread = async () => {
      const res = await fetch("/api/create-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: storedUsername }),
      });
      const data = await res.json();
      console.log("API Response from create-thread:", data);
      if (data.threadId) {
        setThreadId(data.threadId);
        localStorage.setItem("kovalThreadId", data.threadId);
      } else {
        console.error("Thread creation failed");
      }
    };
    createThread();
  } else {
    setThreadId(storedThreadId);
  }
}, []);
