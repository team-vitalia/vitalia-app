
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

URL = "http://localhost:8081"

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 20)

try:
    driver.get(URL)
    print("Página abierta:", driver.current_url)

    print("Buscando campo de correo...")
    correo = wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, '[data-testid="login-email"]')
        )
    )

    print("Buscando campo de contraseña...")
    password = wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, '[data-testid="login-password"]')
        )
    )

    correo.send_keys("prueba_vitalia@example.com")
    password.send_keys("ClavePrueba123")

    assert correo.get_attribute("value") == "prueba_vitalia@example.com"
    assert password.get_attribute("value") == "ClavePrueba123"

    print("Buscando botón de inicio de sesión...")
    boton = wait.until(
        EC.element_to_be_clickable(
            (By.CSS_SELECTOR, '[data-testid="login-submit"]')
        )
    )

    assert boton.is_enabled()

    print("\nPR-LOGIN-003: APROBADA")
    print("Los campos aceptan datos y el botón está habilitado.")

except Exception as error:
    print("\nPR-LOGIN-003: FALLIDA")
    print(f"Detalle: {type(error).__name__}: {error}")

    driver.save_screenshot("error_login.png")
    print("Captura guardada como error_login.png")

finally:
    input("\nPresiona ENTER para cerrar el navegador...")
    driver.quit()
