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

# selenium settings
chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--incognito")
d = DesiredCapabilities.CHROME
d['goog:loggingPrefs'] = { 'browser':'ALL' }

# init and start the driver
driver = webdriver.Chrome(executable_path="./chromedriver", options=chrome_options, desired_capabilities=d)
driver.get('http://127.0.0.1:8080')

# login using solidcommunity.net
login_btn = driver.find_element(by=By.XPATH, value='/html/body/div/header/div[2]/div/form/div[4]/input')
login_btn.click()
time.sleep(5)

# enter credentials
input_username = driver.find_element(by=By.ID, value='username')
input_password = driver.find_element(by=By.ID, value='password')
input_username.send_keys('')
input_password.send_keys('')
time.sleep(5)
input_password.send_keys(Keys.ENTER)

# benchmarking values list
load_time = [] # for data_batch size \in [0:5085]

for data_batch in range(15, MAX_DATA_BATCH_SIZE+1, 15):
    # refresh page
    if data_batch != 15:
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
    time.sleep(15) 



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