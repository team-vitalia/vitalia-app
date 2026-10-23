
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

    correo.send_keys("correo_invalido")

    assert correo.get_attribute("value") == "correo_invalido"

    print("PR-LOGIN-005: APROBADA")
    print("El campo acepta el texto de prueba.")

except Exception as error:
    print("PR-LOGIN-005: FALLIDA")
    print(f"Detalle: {type(error).__name__}: {error}")

finally:
    input("Presiona ENTER para cerrar...")
    driver.quit()
