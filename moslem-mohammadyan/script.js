
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

if (loginForm && loginMessage) {
    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!email || !password) {
            loginMessage.textContent = "لطفاً تمام فیلدها را تکمیل کنید.";
            loginMessage.style.color = "red";
            return;
        }

        if (password.length < 6) {
            loginMessage.textContent = "رمز عبور باید حداقل ۶ کاراکتر باشد.";
            loginMessage.style.color = "red";
            return;
        }

        loginMessage.textContent =
            "اعتبارسنجی اولیه انجام شد؛ ورود واقعی در این پروژه پیاده‌سازی نشده است.";
        loginMessage.style.color = "green";
    });
}
