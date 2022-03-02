# Solid Calendar Store setup guide

This file contains the setup guide for the [Solid Calendar Store](https://github.com/KNowledgeOnWebScale/solid-calendar-store): a CSS (Community Solid Server) extension / plugin to support calendar transformation, aggregation and relevant API endpoints.

---

## Set up Solid Calendar Store

The Solid Calendar Store can be seen as a modified version of CSS. In fact, it is a "plugin" to CSS, and the given configuration lunches both CSS and the Calendar Store plugin.



The steps to set up it are stated in their [README](https://github.com/KNowledgeOnWebScale/solid-calendar-store#how-to-run). It is correct, but misses some important aspects, which are added here:

1. In step 4, the configuration file has two main fields to modify, which are marked with `**SOMETHING**` in the file:
   
   1. `HttpGetStore:_options_url` in the part with `"@id": "my:PersonalGoogleCalendar"`: the URL to a valid calendar `.ics` file. This must be correct, otherwise you will encounter errors when using the Calendar Store.
   
   2. `AvailabilityStore:_options_name`: custom name for yourself. It is not critical if you leave the example value.

2. In step 5 (i.e. run server), the working directory should be within the `examples` directory. This is because:
   
   1. `-m ..` means to start context look up in the parent directory. Based on our experience, the specified directory for that argument should be the project's root.
   
   2. The `config.json` specifies some other files used to start the server. They are located under `examples` directory.



## Using the Calendar Store

### API endpoint

You can directly perform HTTP request to the API endpoints (e.g. from your browser, or using `curl`). The available API endpoints are configured in the configuration file.



The example configuration file contains one API endpoint: `availability`. You can access it from `https://SERVER/availability`. Note that there should not be a slash `/` at the end.



The list of available endpoints can be found [here](https://github.com/KNowledgeOnWebScale/solid-calendar-store#endpoints).



### KNoodle

[KNoodle](https://github.com/KNowledgeOnWebScale/knoodle/) is a companion Solid App developed for the Calendar Store.



## Troubleshooting

### Error 500 when accessing calendar store

If you get HTTP error 500 when using calendar store API endpoint (e.g. `/availability`), you may configured an incorrect URL to your personal calendar.



### Error 404 when accessing calendar API endpoint

Check if you have an excessive `/` at the end. Normally, the API endpoints should not have `/` at the end.

Otherwise, there may be a configuration error.


