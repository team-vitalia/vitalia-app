
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 20)

try:
    driver.get("http://localhost:8081")

    password = wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, '[data-testid="login-password"]')
        )
    )

    tipo = password.get_attribute("type")

    assert tipo == "password", (
        f"Se esperaba type='password', pero se encontró '{tipo}'"
    )

    print("PR-LOGIN-004: APROBADA")
    print("La contraseña está oculta al escribir.")

except Exception as error:
    print("PR-LOGIN-004: FALLIDA")
    print(f"Detalle: {type(error).__name__}: {error}")

finally:
    input("Presiona ENTER para cerrar...")
    driver.quit()
