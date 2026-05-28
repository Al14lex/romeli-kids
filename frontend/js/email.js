const EMAILJS_PUBLIC_KEY = "FysG0eYMG0GLg6F8M";
const EMAILJS_SERVICE_ID = "service_rqkt7ab";
const EMAILJS_TEMPLATE_ID = "template_r2q28me";

function getErrorMessage(error) {
  const status = Number(error?.status);
  const text = String(error?.text || "").toLowerCase();

  if (
    status === 412 &&
    (text.includes("invalid grant") ||
      text.includes("please reconnect your gmail account"))
  ) {
    return "Wysyłka jest chwilowo niedostępna. Skrzynka nadawcy wymaga ponownego połączenia. Spróbuj ponownie później.";
  }

  if (status === 429) {
    return "Wysłano zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.";
  }

  return "Ups! Coś poszło nie tak. Spróbuj ponownie później.";
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const submitBtn = document.getElementById("submit-btn");
  const statusBox = document.getElementById("status");

  if (!form || !submitBtn || !statusBox) return;

  const emailjsClient = window.emailjs;

  if (
    !emailjsClient ||
    typeof emailjsClient.init !== "function" ||
    typeof emailjsClient.send !== "function"
  ) {
    statusBox.className = "status status--err";
    statusBox.textContent =
      "Formularz jest chwilowo niedostępny. Spróbuj odświeżyć stronę.";
    submitBtn.disabled = true;
    return;
  }

  emailjsClient.init(EMAILJS_PUBLIC_KEY);

  let isSubmitting = false;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    const honey = form.querySelector('[name="company"]');
    if (honey && honey.value.trim() !== "") return;

    if (!form.reportValidity()) return;

    const templateParams = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      message: form.message.value.trim(),
    };

    if (
      !templateParams.name ||
      !templateParams.email ||
      !templateParams.phone ||
      !templateParams.message
    ) {
      statusBox.className = "status status--err";
      statusBox.textContent = "Uzupełnij wszystkie wymagane pola.";
      return;
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Wysyłanie...";
    statusBox.className = "status";
    statusBox.textContent = "";

    try {
      await emailjsClient.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );
      statusBox.className = "status status--ok";
      statusBox.textContent = "Dziękujemy! Wiadomość została wysłana.";
      form.reset();
    } catch (error) {
      statusBox.className = "status status--err";
      statusBox.textContent = getErrorMessage(error);
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Wyślij";
    }
  });
});
