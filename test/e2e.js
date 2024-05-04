const { By, Key, Builder, until } = require("selenium-webdriver");
require("chromedriver");

const assert = require("assert");

describe("E2E", function() {
    let driver;

    const USERNAME = "jamesmith132324@gmail.com";
    const PASSWORD = "Qwerty@123";
    const URL = "http://localhost:3000/";

    this.timeout(100000);

    this.beforeEach(function() {
        driver = new Builder()
            .forBrowser("chrome").build();
    });

    this.afterEach(function() {
        driver.quit();
    });

    it("Book a meeting", async function() {
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

        await driver.wait(until.elementLocated(By.id("react-select-5-input")), 5000).sendKeys("test", Key.RETURN)
            .catch(error => {
                console.log("Error, couldn't locate element");
            });

        const next = await driver.wait(until.elementLocated(By.xpath("//span[text()='Next']")), 5000)
        .catch(error => {
            console.log("Error, couldn't locate element");
        });
        next.click();
        
        const timeslot = await driver.wait(until.elementLocated(By.xpath("//div[text()='02:00 PM - 02:30 PM']")), 5000)
        .catch(error => {
            console.log("Error, couldn't locate element timeslot");
        });
        timeslot.click();

        const search = await driver.wait(until.elementLocated(By.xpath("//button[@id='searchButton']")), 5000)
        .catch(error => {
            console.log("Error, couldn't locate element search");
        });

        // For some reason need to click this twice to work
        search.click();
        search.click();

        await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Enter meeting title']")), 5000).sendKeys("E2E-Automated test meeting")
            .catch(error => {
                console.log("Error, couldn't locate element enter meeting title");
            });

        const first_room = await driver.wait(until.elementLocated(By.xpath("//tr[@data-row-key='0']//input")), 5000)
        .catch(error => {
            console.log("Error, couldn't locate element");
        });
        first_room.click();

        const book_button = await driver.wait(until.elementLocated(By.xpath("//span[text()='Book']")), 5000)
        .catch(error => {
            console.log("Error, couldn't locate element");
        });
        book_button.click();

        const delete_button = await driver.wait(until.elementLocated(By.xpath("//span[text()='Delete']")), 5000)
        .catch(error => {
            console.log("Error, couldn't locate element");
        });
        delete_button.click();

        const delete_confirmation_button = await driver.wait(until.elementLocated(By.xpath("//span[text()='OK']")), 5000)
        .catch(error => {
            console.log("Error, couldn't locate element");
        });
        delete_confirmation_button.click();

        // need this because it'll end too quickly before clicking the button
        await sleep(5000);
    });
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}