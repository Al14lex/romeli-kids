
document.addEventListener("DOMContentLoaded", () => {
    emailjs.init("YOUR_PUBLIC_KEY");
  
    const form = document.getElementById("contact-form");
    const submitBtn = document.getElementById("submit-btn");
    const statusBox = document.getElementById("status");
  
    if (!form || !submitBtn || !statusBox) return;
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      // Honeypot (anti-spam)
      const honey = form.querySelector('[name="company"]');
      if (honey && honey.value.trim() !== "") return;
  
      if (!form.reportValidity()) return;
  
      submitBtn.disabled = true;
      submitBtn.textContent = "Wysyłanie...";
      statusBox.className = "status";
      statusBox.textContent = "";
  
      const templateParams = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        message: form.message.value.trim(),
        // time: new Date().toLocaleString('pl-PL')
      };
  
      try {
        await emailjs.send(
          "YOUR_SERVICE_ID",   // <-- замініть
          "YOUR_TEMPLATE_ID",  // <-- замініть
          templateParams
        );
        statusBox.className = "status status--ok";
        statusBox.textContent = "Dziękujemy! Wiadomość została wysłana.";
        form.reset();
      } catch (err) {
        console.error(err);
        statusBox.className = "status status--err";
        statusBox.textContent =
          "Ups! Coś poszło nie tak. Spróbuj ponownie później.";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Wyślij";
      }
    });
  });
  