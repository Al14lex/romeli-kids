
document.addEventListener("DOMContentLoaded", () => {
  emailjs.init({ publicKey: "FysG0eYMG0GLg6F8M" });
console.log("working")
  const form = document.getElementById("contact-form");
  const btn = document.getElementById("submit-btn");
  const status = document.getElementById("status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    btn.disabled = true;
    btn.textContent = "Wysyłanie...";
    status.textContent = "";

    const params = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      message: form.message.value.trim(),
    };

    try {
      await emailjs.send("service_rqkt7ab", "template_r2q28me", params);
      status.className = "status status--ok";
      status.textContent = "Dziękujemy! Wiadomość została wysłana.";
      form.reset();
    } catch (err) {
      status.className = "status status--err";
      status.textContent = "Ups! Coś poszło nie tak. Spróbuj ponownie później.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Wyślij";
    }
  });
});
