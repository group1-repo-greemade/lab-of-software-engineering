
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (email.trim() === "" || password.trim() === "") {
        message.textContent = "لطفاً تمام فیلدها را پر کنید.";
        message.style.color = "#f87171";
        return;
    }

    message.textContent = "فرم با موفقیت بررسی شد!";
    message.style.color = "#4ade80";
});
