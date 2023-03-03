document.addEventListener("DOMContentLoaded", async()=>{
    loadForecastUsingGeoLocation();
    const searchInput = document.querySelector(".input");
    searchInput.addEventListener("input", debounceSearch)
    searchInput.addEventListener("change", handleCitySelection)
})

const callAPI = async()=>{
    const currentData = await getCurrentWeather(selectedCity);
    loadCurrentWeatherInfo(currentData)
    const hourlyForecast = await getHourlyForecast(currentData);
    loadHourlyForecast(currentData, hourlyForecast)
    loadFeelsLike(currentData)
    loadhumidity(currentData)
    loadFiveDayForecast(hourlyForecast)
}

// api function
const apikey = "15a772b7349b2ebb3cbbd7ab3fbb0495";

const getCurrentWeather = async({lat, lon, name:city})=>{
    // const city = "delhi";
    console.log(city)
    const url = lat && lon ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apikey}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apikey}&units=metric` ;
    const response = await fetch(url);
    
    return response.json()
}

const loadCurrentWeatherInfo =({name, main:{temp, temp_max, temp_min}, weather:[{description}]})=>{
    const currentForecastElement = document.querySelector("#current-forecast");
    currentForecastElement.querySelector(".city").textContent = name;
    currentForecastElement.querySelector(".temp").textContent = `${temp}°`;
    currentForecastElement.querySelector(".description").textContent = description;
    currentForecastElement.querySelector(".minmax").textContent = `H : ${temp_max}°       L : ${temp_min}°`;
}

const getHourlyForecast = async({name : city}) => {
    const hourReaponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apikey}&units=metric`);
    const hourData = await hourReaponse.json();

    return hourData.list.map(forecast=>{
        const {main : {temp, temp_max, temp_min}, dt, dt_txt, weather :[{description, icon}]} = forecast
        return {temp, temp_max, temp_min, dt, dt_txt, description, icon};
    })
}

const loadHourlyForecast = ({main: {temp : tempNow}, weather: [{icon : iconNow}]},hourlyForecast) =>{

    // formats time

    const timeFormatter = Intl.DateTimeFormat("en",{  
        hour12:true, hour:"numeric"
    })

    let dataFor12Hour = hourlyForecast.slice(2,10);
    console.log(dataFor12Hour);
    const hourlyContainer = document.querySelector(".hourly-container");

    let innerHTMLstring = `<article>
    <h3 class="time">${"Now"}</h3>
    <img class="icon" src="${createIconURL(iconNow)}"/>
    <p class="hourly-temp">${tempNow}°</p>
</article>`;

    for(let {temp, icon, dt_txt} of dataFor12Hour){
        innerHTMLstring += `<article>
            <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
            <img class="icon" src="${createIconURL(icon)}"/>
            <p class="hourly-temp">${temp}°</p>
        </article>`
    }
    hourlyContainer.innerHTML = innerHTMLstring;
}

const createIconURL = (icon) => `http://openweathermap.org/img/wn/${icon}@2x.png`

const loadFeelsLike = ({main: {feels_like}})=>{
    let container = document.querySelector("#feels-like");
    container.querySelector(".feel-temp").textContent = `${feels_like}°`
}

const loadhumidity = ({main: {humidity}})=>{
    let humidcontainer = document.querySelector("#humidity");
    humidcontainer.querySelector(".humid").textContent = `${humidity}%`
}

// 5 Day forecast

const loadFiveDayForecast = (hourlyForecast) =>{
    const dayWiseForecast = calculateDayWiseForecast(hourlyForecast);
    const container = document.querySelector(".five-day-forecast");
    let dayWiseInfo = "";

    Array.from(dayWiseForecast).map(([day, {temp_max, temp_min, icon}], index) => {
        if(index < 6){
            dayWiseInfo += `<article class="day-wise">
                <h3>${index === 0 ? "Today" : day}</h3>
                <img src="${createIconURL(icon)}" alt="" class="icons">
                <p class="min-temp">${temp_min}°</p>
                <p class="max-temp">${temp_max}°</p>
            </article>`
        }
    })
    container.innerHTML = dayWiseInfo;
}

const Day_Of_Week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const calculateDayWiseForecast = (hourlyForecast)=>{
    let dayWiseForecast = new Map();
    
    for(let forecast of hourlyForecast){
        const [date] = forecast.dt_txt.split(" ")
        const dayOfWeek = Day_Of_Week[new Date(date).getDay()]

        if(dayWiseForecast.has(dayOfWeek)){
            let forecastForDay = dayWiseForecast.get(dayOfWeek);
            forecastForDay.push(forecast);
            dayWiseForecast.set(dayOfWeek, forecastForDay)
        }
        else{
            dayWiseForecast.set(dayOfWeek, [forecast]);
        }
    }

    for(let[key, value] of dayWiseForecast){
        let temp_min = Math.min(...Array.from(value, val=> val.temp_min));
        let temp_max = Math.max(...Array.from(value, val=> val.temp_max));

        dayWiseForecast.set(key, {temp_min, temp_max, icon:value.find(v=>v.icon).icon})
    }

    console.log(dayWiseForecast);
    return dayWiseForecast;
}

// City name dropdown functions

const getCities = async(SearchText) => {
    const resp = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${SearchText}&limit=5&appid=${apikey}`)
    return resp.json();
}

// debounce 
function debounce(func){
    let time;
    return (...args) =>{
        clearTimeout(time);
        time = setTimeout(() => {
            func.apply(this, args)
        }, 500);
    }
}

const debounceSearch = debounce((event)=> onSearchChange(event));

const onSearchChange = async (event)=>{
    let {value} = event.target;
    let options = "";

    if(!value){
        selectedCity = null;
        selectedCityText = "";
    }
    if(value && selectedCityText !== value){
        const citylist = await getCities(value);
    
        for(let{lat, lon, name, state, country} of citylist){
            options += `<option data-city-details='${JSON.stringify({lat, lon, name})}' value="${name}, ${state}, ${country}"></option>`
        }
        document.querySelector("#cities").innerHTML = options;
    }
}

const handleCitySelection = (event) =>{
    selectedCityText = event.target.value;
    let optionsCity = document.querySelectorAll("#cities > option");
    console.log("hii");
    console.log(optionsCity)
    if(optionsCity?.length){
        let selectedOption = Array.from(optionsCity).find(opt => opt.value === selectedCityText);
        console.log(selectedOption)
        selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
        console.log({selectedCity})
        callAPI()
    } 
}

let selectedCityText;
let selectedCity;

// live location 

const loadForecastUsingGeoLocation = () => {
    navigator.geolocation.getCurrentPosition(({coords}) => {
        const {latitude: lat, longitude : lon} = coords;
        console.log("hi")
        selectedCity = {lat,lon};
        callAPI();
    }, error => console.log(error))
}