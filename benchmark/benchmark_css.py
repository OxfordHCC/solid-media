import pandas as pd

import time
import os

from selenium import webdriver

from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

PATH = os.getcwd()
MAX_DATA_BATCH_SIZE = 5085
START_DATA_BATCH_SIZE = 1410 # 15

# selenium settings
chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--incognito")
d = DesiredCapabilities.CHROME
d['goog:loggingPrefs'] = { 'browser':'ALL' }

# init and start the driver
driver = webdriver.Chrome(executable_path="./chromedriver", options=chrome_options, desired_capabilities=d)
driver.get('http://127.0.0.1:8080')

valid_urls = ['localhost:8080/', 'localhost:8080', 'http://localhost:8080/', 'http://127.0.0.1:808']

def selectPod():
    # css login
    css_login = driver.find_element(by=By.ID, value='provider')
    css_login.send_keys('https://hunar.pod.ewada.ox.ac.uk/')
    login_btn = driver.find_element(by=By.XPATH, value='/html/body/div/header/div[2]/div/form/div[1]/div[2]/input')
    login_btn.click()
    time.sleep(5)

def authorise():
    # authorise client
    driver.find_element(by=By.NAME, value='submit').click()
    time.sleep(3)

def login():
    selectPod()
    # css login - enter credentials
    input_username = driver.find_element(by=By.ID, value='email')
    input_password = driver.find_element(by=By.ID, value='password')
    input_username.send_keys('hunarbatra147@gmail.com')
    input_password.send_keys('14HunarLovesSolid14@')
    time.sleep(5)
    input_password.send_keys(Keys.ENTER)
    time.sleep(5)
    authorise()
    
def check_url():
    curr_url = driver.current_url
    if curr_url not in valid_urls:
        driver.get('http://127.0.0.1:8080/')
        time.sleep(3)

def logout():
    driver.find_element(by=By.XPATH, value='/html/body/div/div/div[2]/button[3]').click()
    # driver.find_element_by_class_name("btn-primary").click()
    driver.find_element(by=By.CLASS_NAME, value="btn-primary").click()
    time.sleep(3)
    selectPod()
    try:
        authorise()
    except:
        pass
    time.sleep(3)
    check_url()
       
login()
check_url()


# benchmarking values list
load_time = ['60'] # for data_batch size \in [0:5085]


# main LOOP
for data_batch in range(START_DATA_BATCH_SIZE, MAX_DATA_BATCH_SIZE+1, 15):
    process_start_time = time.time()
    
    # refresh page
    if data_batch != START_DATA_BATCH_SIZE:
        try:
            logout()
        except:
            pass
            
    time.sleep(3)  

    while True:     
        if len(load_time) and ((time.time() - process_start_time) > (max(float(load_time[-1]), 60) + 15)):
            print('loading since a long time')
            # logout()
            driver.close()
            time.sleep(2)
            driver = webdriver.Chrome(executable_path="./chromedriver", options=chrome_options, desired_capabilities=d)
            driver.get('http://127.0.0.1:8080')
            login()
            check_url()
            process_start_time = time.time()
        try:
            l = driver.find_element(by=By.CSS_SELECTOR, value="h3")
            # compute load time and save it
            for entry in driver.get_log('browser'):
                if len(entry['message'].split('http://127.0.0.1:8080/components/DiscoverPane.js')) == 2:
                    test = entry['message'].split('http://127.0.0.1:8080/components/DiscoverPane.js')[1]
                    load_time.append(test.split('time taken: ')[-1].split(' seconds')[0])
                    print('load time saved for ' + str(data_batch-15) + ' movies: ' + str(load_time[-1]) + 's')
            break
        except:
            pass

    # press add movies button
    while True:
        try:
            add_movies_btn = driver.find_element(by=By.XPATH, value='/html/body/div/div/div[2]/button[1]')
            add_movies_btn.click()
            break
        except:
            pass

    # Press Import from Netflix button
    while True:
        try:
            import_btn = driver.find_element(by=By.XPATH, value='/html/body/div/div/div[4]/div/div/div[2]')
            import_btn.click()
            break
        except:
            pass

    # choose file button
    while True:
        try:
            upload_file = driver.find_element(by=By.XPATH, value='/html/body/div/div/div[4]/div/div/input')
            # upload batch data
            upload_file.send_keys(PATH + '/data/data-partitions/netflix-' + str(data_batch) + '.csv')
            break
        except:
            pass

    # allow few seconds for data upload (15 movies)
    time.sleep(10) 
    



# last refresh to store load time value for the last uploaded data_batch
while True:
    try:
        driver.refresh()
        break
    except:
        pass

while True:
    try:
        l = driver.find_element(by=By.CSS_SELECTOR, value="h3")
        # compute load time and save it
        for entry in driver.get_log('browser'):
            if len(entry['message'].split('http://127.0.0.1:8080/components/DiscoverPane.js')) == 2:
                test = entry['message'].split('http://127.0.0.1:8080/components/DiscoverPane.js')[1]
                load_time.append(test.split('time taken: ')[-1].split(' seconds')[0])
                print('load time saved for ' + str(MAX_DATA_BATCH_SIZE) + ' movies: ' + str(load_time[-1]) + 's')
        break
    except:
        pass


# save benchmarking results as a csv file
x = [i for i in range(0, MAX_DATA_BATCH_SIZE+1, 15)]
df = pd.DataFrame({'size': x, 'time': load_time})
df.to_csv('benchmarking_results.csv', index=False)