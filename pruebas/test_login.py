"""Pruebas E2E del login (versión pytest de los scripts manuales de /pruebas).

Diferencias con los scripts originales:
- Fallan de verdad (los originales atrapan la excepción y salen con código 0,
  así que un CI nunca los detectaría como fallidos).
- No usan input(), por lo que no se quedan bloqueados en CI.
- URL y modo headless se controlan con BASE_URL y HEADLESS.
"""
import os

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.getenv("BASE_URL", "http://localhost:8081")
HEADLESS = os.getenv("HEADLESS", "0") == "1"


@pytest.fixture
def driver():
    opts = webdriver.ChromeOptions()
    if HEADLESS:
        opts.add_argument("--headless=new")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--window-size=1280,900")
    d = webdriver.Chrome(options=opts)
    yield d
    d.quit()


def _visible(driver, testid):
    return WebDriverWait(driver, 20).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, f'[data-testid="{testid}"]'))
    )


def test_pr_login_006_campos_vacios(driver):
    driver.get(BASE_URL)
    assert _visible(driver, "login-email").get_attribute("value") == ""
    assert _visible(driver, "login-password").get_attribute("value") == ""


def test_pr_login_004_password_oculta(driver):
    driver.get(BASE_URL)
    assert _visible(driver, "login-password").get_attribute("type") == "password"


def test_pr_login_005_campo_correo_acepta_texto(driver):
    driver.get(BASE_URL)
    correo = _visible(driver, "login-email")
    correo.send_keys("correo_invalido")
    assert correo.get_attribute("value") == "correo_invalido"


def test_pr_login_003_escritura_y_boton(driver):
    driver.get(BASE_URL)
    correo = _visible(driver, "login-email")
    password = _visible(driver, "login-password")
    correo.send_keys("prueba_vitalia@example.com")
    password.send_keys("ClavePrueba123")
    assert correo.get_attribute("value") == "prueba_vitalia@example.com"
    assert password.get_attribute("value") == "ClavePrueba123"
    boton = WebDriverWait(driver, 20).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="login-submit"]'))
    )
    assert boton.is_enabled()
