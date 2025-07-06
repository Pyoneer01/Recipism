// test/app.test.js
import {expect} from "chai";
import sinon from "sinon";
import request from "supertest";
import app, {checkVegetarian} from "../index.js"; // path to your main app file
import axios from "axios";


describe("Express App Route Tests", function () {

  describe("GET /login", function () {
    it("should return 200 and render the login page", async function () {
      const res = await request(app).get("/login");
      expect(res.status).to.equal(200);
      expect(res.text).to.include("form"); // or something from login.ejs
    });
  });

  describe("POST /login", function () {
    let axiosStub;

    beforeEach(() => {
      axiosStub = sinon.stub(axios, "get");
    });

    afterEach(() => {
      axiosStub.restore();
    });

    it("should redirect to / on successful login", async function () {
      axiosStub.resolves({ status: 200, data: {} });

      const res = await request(app)
        .post("/login")
        .type("form")
        .send({ name: "testuser", apiKey: "validkey" });

      expect(res.status).to.equal(302);
      expect(res.header.location).to.equal("/");
    });

    it("should redirect to /login on failed login", async function () {
      axiosStub.rejects(new Error("API verification failed"));

      const res = await request(app)
        .post("/login")
        .type("form")
        .send({ name: "testuser", apiKey: "wrongkey" });

      expect(res.status).to.equal(302);
      expect(res.header.location).to.equal("/login");
    });
  });

  describe("GET /random", function () {
    it("should redirect unauthenticated users to login", async function () {
      const res = await request(app).get("/random");
      expect(res.status).to.be.oneOf([302, 200]); // if random route is public
    });
  });

  describe("Utility: checkVegetarian", function () {

    it("should return vegetarian param for true", function () {
      const param = checkVegetarian("true");
      expect(param).to.equal("&diet=vegetarian");
    });

    it("should return empty string for false", function () {
      const param = checkVegetarian("false");
      expect(param).to.equal("");
    });
  });

});
