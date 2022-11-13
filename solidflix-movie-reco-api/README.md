### - Environment setup steps using ```Conda```:

1. ```conda create --name solidflix-env --file requirements.txt```

2. ```conda activate solidflix-env```

3. ```conda install pip```

4. ```pip install tmdbv3api```

5. ```pip install flask-ngrok```

6. ```flask run```

7. To use ngrok:
```ngrok 5000 http```

### - Environment setup steps w/o using ```Conda```:

1. ```python3 -m venv .solidflix-env```

2. ```source .solidflix-env/bin/activate```

3. ```pip install -r ./requirements-pip.txt```

4. ```flask run```

5. To use ngrok:
```ngrok 5000 http```
