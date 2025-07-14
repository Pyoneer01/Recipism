import express from "express";
import axios from "axios";
import env from "dotenv";
import bodyParser from "body-parser";
import cookieParser from 'cookie-parser'; // ✅ Correct for ESM
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import flash from "connect-flash";

const app = express();
const port = process.env.PORT || 3000;
env.config();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(
    session({
        secret:"SECRETWORD",
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24,
        }
    })
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

const API_URL = "https://api.spoonacular.com/";
let apiKey = "";
let name = "";

const cuisines = ['African', 'Asian', 'American', 'British', 'Cajun', 'Caribbean', 'Chinese', 'Eastern European', 'European', 'French', 'German', 'Greek', 'Indian', 'Irish', 'Italian', 'Japanese', 'Jewish', 'Korean', 'Latin American', 'Mediterranean', 'Mexican', 'Middle Eastern', 'Nordic', 'Southern', 'Spanish', 'Thai', 'Vietnamese']


function shuffle(array, limit){
    limit = Math.min(array.length, limit);
    for(let currentIndex = 0; currentIndex<limit; currentIndex++){
        let randomIndex = Math.floor(Math.random()*array.length);
        let temp = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temp;
    }
}

function checkVegetarian(isVegetarian){
    let extraParam = '';
    if(isVegetarian === 'true'){
        extraParam = "&diet=vegetarian"
    }
    return extraParam;
}


app.get("/", (req, res) => {
    if(req.user){
        name = req.user["name"];
        apiKey = req.user["apiKey"];
    }
    if(req.isAuthenticated()){
        res.render("home.ejs", {cuisineList: cuisines, userName: name});
    } else{
        res.redirect("/login");
    }
});

app.get("/login", (req, res)=>{
    const errorMessage = req.flash("error");
    let missingCredentials = false;
    let invalidApiKey = false;
    if(errorMessage[0] === 'Missing credentials'){
        missingCredentials = true;
    } else if(errorMessage[0] === 'API verification failed') {
        invalidApiKey = true
    }
    res.render("login.ejs", {invalidApiKey, missingCredentials});

});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true, 
}));

app.get("/logout", (req, res) => {
    req.logout(function(err) {
        if (err) {
            console.error("Logout error:", err);
            return res.redirect("/");
        }
        res.redirect("/login");
    });
});

  
app.get("/random", async (req, res) => {
    try{
        const randomOffset = Math.floor(Math.random()*850);
        const extraParam = checkVegetarian(req.cookies.vegetarian);
        const response = await axios.get(`${API_URL}recipes/complexSearch?apiKey=${apiKey}&number=50&offset=${randomOffset}` + extraParam);
        const results = response.data.results;
        shuffle(results, 10);
        const randomRecipes = results.slice(0, 10);
        if(randomRecipes.length != 0){
           res.render("index.ejs", {content: randomRecipes, cuisineList: cuisines}); 
        } else {
            res.render("index.ejs", {cuisineList: cuisines});
        }
    }
    catch(error){
        res.render("index.ejs", {cuisineList: cuisines, errorMessage: "Log in again"});
        console.log(error.message);
    }
});

app.post("/search", async (req, res)=>{
    try{
        const food = req.body["foodItem"];
        const extraParam = checkVegetarian(req.cookies.vegetarian);
        const response = await axios.get(`${API_URL}recipes/complexSearch?titleMatch=${food}&apiKey=${apiKey}&number=50`+extraParam);
        const results = response.data.results;
        const recipes = results.slice(0, 10);
        if(recipes.length != 0){
           res.render("index.ejs", {content: recipes, cuisineList: cuisines}); 
        } else {
            res.render("index.ejs", {cuisineList: cuisines});
        }
        
    }
    catch(error){
        console.log(error)
        res.render("index.ejs", {cuisineList: cuisines})
        console.log(error.message);
    }
    
});

app.post("/getRecipe", async (req, res)=>{
    try{
        const id = req.body["foodId"];
        const title = req.body["foodTitle"];
        const image = req.body["foodImage"];
        const item = {title: title, image: image};
        const ingredientsResponse = await axios.get(`${API_URL}recipes/${id}/ingredientWidget.json?apiKey=${apiKey}`);
        const ingredientsResult = ingredientsResponse.data.ingredients;
        let ingredients = []
        ingredientsResult.forEach(ingredient => {
            const ingredientName = ingredient.name;
            const amt = ingredient.amount.metric.value
            const unit = ingredient.amount.metric.unit;
            const ing = {name: ingredientName, amt: "" + amt + " " + unit };
            ingredients.push(ing);
        });
        const recipeInstructions = await axios.get(`${API_URL}recipes/${id}/analyzedInstructions?apiKey=${apiKey}`);
        const instructions = recipeInstructions.data;
        res.render("recipe.ejs", {content: item, ingredients: ingredients, recipeInstructions: instructions, cuisineList: cuisines});
    }
    catch(error){
        res.render("recipe.ejs", {cuisineList: cuisines})
        console.log(error.message);
    }
    
});

app.post("/getCuisine", async(req, res)=> {
    try{
        const selectedCuisine = req.body["selectedCuisine"];
        const extraParam = checkVegetarian(req.cookies.vegetarian);
        const response = await axios.get(`${API_URL}recipes/complexSearch?cuisine=${selectedCuisine}&apiKey=${apiKey}&number=50` + extraParam);
        const results = response.data.results;
        shuffle(results, 10);
        const recipes = results.slice(0, 10);
        if(recipes.length != 0){
           res.render("index.ejs", {content: recipes, cuisineList: cuisines}); 
        } else {
            res.render("index.ejs", {cuisineList: cuisines});
        }
    } catch(error){
        res.render("index.ejs", {cuisineList: cuisines, errorMessage: "Log in again"})
        console.log(error.message);
    }
});


app.get("/cookWithThis", (req, res) => {
    try{
        res.render("cookWithThis.ejs", {cuisineList: cuisines});
    }catch(error){
        res.render("cookWithThis.ejs", {cuisineList: cuisines, errorMessage: "Log in again"});
        console.log(error.message);
    }
});

app.post("/cookWithThis", async (req, res) => {
    try{
        const ingredients = req.body["ingredients"].replace(/\s+/g, '');
        const ingredientsArray = ingredients.split(",");
        const ingredientsParsed = ingredientsArray.join(",+").toLowerCase();
        const response = await axios.get(`${API_URL}recipes/findByIngredients?ingredients=${ingredientsParsed}&apiKey=${apiKey}`);
        const results = response.data;
        const recipes = results.slice(0, 10);
        if(recipes.length != 0){
           res.render("index.ejs", {content: recipes, cuisineList: cuisines}); 
        } else {
            res.render("index.ejs", {cuisineList: cuisines});
        }
    }catch(error){
        res.render("index.ejs", {cuisineList: cuisines});
        console.log(error.message);
    }
});


passport.use(new Strategy(
  {
    usernameField: "name",     // <== These must match your login form
    passwordField: "apiKey"
  },
  async (name, apiKey, done) => {
    try {
      const res = await axios.get(`${API_URL}recipes/complexSearch?apiKey=${apiKey}`);
      if (res.status === 200) {
        return done(null, { name, apiKey });
      } else {
        return done(null, false, { message: "Invalid API Key" });
      }
    } catch (err) {
      console.error("Login error:", err.message);
      return done(null, false, { message: "API verification failed" });
    }
  }
));

passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}


export default app; 
export { checkVegetarian, shuffle };

