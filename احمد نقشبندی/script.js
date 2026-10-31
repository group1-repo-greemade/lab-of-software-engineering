
const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");

const formMessage = document.getElementById("formMessage");

const loginButton = document.getElementById("loginButton");
const buttonText = document.getElementById("buttonText");
const loader = document.getElementById("loader");

const togglePassword = document.getElementById("togglePassword");

// اطلاعات آزمایشی برای تست صفحه
const demoEmail = "admin@example.com";
const demoPassword = "12345678";

// بررسی معتبر بودن ایمیل
function isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

// نمایش خطای یک فیلد
function showFieldError(input, errorElement, message) {
    input.classList.add("invalid");
    errorElement.textContent = message;
}

// پاک کردن خطای یک فیلد
function clearFieldError(input, errorElement) {
    input.classList.remove("invalid");
    errorElement.textContent = "";
}

// نمایش پیام کلی فرم
function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = "form-message " + type;
}

// پاک کردن پیام کلی
function clearMessage() {
    formMessage.textContent = "";
    formMessage.className = "form-message";
}

// نمایش و مخفی کردن رمز عبور
togglePassword.addEventListener("click", function () {
    const isPasswordHidden = passwordInput.type === "password";

    passwordInput.type = isPasswordHidden ? "text" : "password";

    togglePassword.textContent = isPasswordHidden
        ? "مخفی کردن"
        : "نمایش";

    togglePassword.setAttribute(
        "aria-label",
        isPasswordHidden ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"
    );
});

// پاک کردن خطاها هنگام تایپ کاربر
emailInput.addEventListener("input", function () {
    clearFieldError(emailInput, emailError);
    clearMessage();
});

passwordInput.addEventListener("input", function () {
    clearFieldError(passwordInput, passwordError);
    clearMessage();
});

// بررسی و ارسال فرم
loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    clearFieldError(emailInput, emailError);
    clearFieldError(passwordInput, passwordError);
    clearMessage();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;

    // بررسی خالی بودن ایمیل
    if (email === "") {
        showFieldError(
            emailInput,
            emailError,
            "لطفاً ایمیل خود را وارد کنید."
        );

        hasError = true;
    }

    // بررسی فرمت ایمیل
    else if (!isValidEmail(email)) {
        showFieldError(
            emailInput,
            emailError,
            "فرمت ایمیل وارد شده صحیح نیست."
        );

        hasError = true;
    }

    // بررسی خالی بودن رمز عبور
    if (password.trim() === "") {
        showFieldError(
            passwordInput,
            passwordError,
            "لطفاً رمز عبور خود را وارد کنید."
        );

        hasError = true;
    }

    // اگر خطایی وجود داشت، ادامه نده
    if (hasError) {
        showMessage(
            "لطفاً اطلاعات ورودی را بررسی کنید.",
            "error"
        );

        return;
    }

    // فعال کردن حالت بارگذاری
    loginButton.disabled = true;
    buttonText.textContent = "در حال بررسی...";
    loader.classList.add("active");

    // شبیه‌سازی بررسی اطلاعات کاربر
    setTimeout(function () {

        // بررسی ایمیل و رمز عبور آزمایشی
        if (email === demoEmail && password === demoPassword) {

            showMessage(
                "ورود موفقیت‌آمیز بود! خوش آمدید.",
                "success"
            );

            passwordInput.value = "";

        } else {

            showFieldError(
                passwordInput,
                passwordError,
                "رمز عبور یا ایمیل اشتباه است."
            );

            showMessage(
                "اطلاعات ورود صحیح نیست. دوباره تلاش کنید.",
                "error"
            );

        }

        // غیرفعال کردن حالت بارگذاری
        loginButton.disabled = false;
        buttonText.textContent = "ورود به حساب";
        loader.classList.remove("active");

    }, 700);
});
