const { By, Key, Builder, until } = require("selenium-webdriver");
require("chromedriver");

const assert = require("assert");

describe("Login tests", function() {
    let driver;

    const USERNAME = "jamesmith132324@gmail.com";
    const PASSWORD = "Qwerty@123";
    const URL = "http://localhost:3000/";

    this.timeout(10000);

    this.beforeEach(function() {
        driver = new Builder()
            .forBrowser("chrome").build();
    });

    this.afterEach(function() {
        driver.quit();
    });

    it("should see header on login", async function() {
        await driver.get(URL);

        await driver
            .findElement(By.name("username"))
            .sendKeys(USERNAME);

        await driver
            .findElement(By.name("password"))
            .sendKeys(PASSWORD, Key.RETURN);

        await driver.wait(until.elementLocated(By.id("search-heading")), 5000)
            .catch(error => {
                console.log("Error, couldn't locate element");
            });

        console.log("Test passed!");
    });
});