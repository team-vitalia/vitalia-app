
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 20)

try:
    driver.get("http://localhost:8081")

    correo = wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, '[data-testid="login-email"]')
        )
    )

    password = wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, '[data-testid="login-password"]')
        )
    )

    assert correo.get_attribute("value") == "", (
        "El campo de correo no está vacío."
    )

    assert password.get_attribute("value") == "", (
        "El campo de contraseña no está vacío."
    )

    print("PR-LOGIN-006: APROBADA")
    print("Los campos están vacíos al abrir el login.")

except Exception as error:
    print("PR-LOGIN-006: FALLIDA")
    print(f"Detalle: {type(error).__name__}: {error}")

finally:
    input("Presiona ENTER para cerrar...")
    driver.quit()
