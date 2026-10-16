
from selenium import webdriver

driver = webdriver.Chrome()

try:
    driver.get("http://localhost:8081")
    print("Título de la página:", driver.title)
    print("URL abierta:", driver.current_url)
    input("Presiona Enter para cerrar el navegador...")
finally:
    driver.quit()
