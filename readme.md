# Infni Scroll
 
 This is a simple vue.js component for **virtualized scrolling over local csv files in the browser**. Its mainly a fun free-time project, also for learning a bit vue.js, html, css, javascript (you always learn something new).

## What is it for?
 However I also have the aspiration to solve an professional problem of web-clients (or was this solved somewhere else already?):

 * You have fat web client (SPA, PWA...) in the business world from which your customer wants to upload or view some **local text file (csv)**
 * the file could potentially be large to huge in size: **hundreds of megabyte to some gigabytes**
 * the files can have about **14 text colums** and several **million lines** 
 * **all data** should be displayed in a **scrollable table**
 * after selecting the file data should be displayed **immediately(!)**
 * **instantly scrolling to the end** must be possible
 * only reading of the data is needed, but it must be a **vue.js component**
 
## The problem
 Okay, generally this is not so hard if you come from desktop frontends, but in the web world such requirements are a bit more peculiar, because browser's do not (yet, 2019)provide an elaborate file API (things like seek, or at least line wise reading).

 However I quickly found that bytewise chunking is possible and that people already wrote amazing libs like line-navigator or papaparse (both available via npm). They allow for almost constant time random file access and extremely fast CSV parsing.

 Moreover virtual table libs for vue.js already exist. But here I found a certain problem: these libs normally assume that the data source can be loaded statically into memory. But with the given requirements it was not possible to wait like 30 seconds till the whole 1 GB file was read and parsed. Actually I don't even want to load the whole file into memory, rather I would like to be able to grab chunks of data as needed (which might be possible with line-navigator and papaparse).  
 Also the existing libs normally think of big tables in categories of thousands of lines at max... but I would like to process millions of lines quickly. So in summary: the given tools for table virtualization in the vue.js world seem not 100% adequate for the task so I wrote somthing myself.

## Concepts and solution

* I use line-navigator to access the files ranomly in hopefully constant time
* The table always only contains just the HTML elements that are needed for the currently displayed part of the table (the area where the user scrolled to).
* Only the data value contents within each row are changed.
* It is not yet clear which solution is better for huge files:
    - Random read access for every scroll action
    - preloading the data in the background and use random access only if the background worker did not yet fetch the needed data

## Status
Currently a first prototype is ready. My main goal was to come at least this far (see bullet points below). I am not sure if I gonna continue this project (it already did cost me the half of my staturday) but I think it is fun to write your own virtual/table/scroller/thingy. 

1. on initial opening only the first 90 lines are read in an instant
2. based on the initial read (aka: **quickload**) the table is initialized and meta values are calculated:
    - based on the first lines and the total file size how many lines do we expecct? ***We need this info to provide the user a measure to which position he might want to jump***
    - How large is the current display area and how many rows do fit into it? 
    - What is the height of a single row so that we can translate from the scrollposition in `px` to the row numbers that we want to display?
    - Based on the estimated number of lines and the row height: set the table to the expecte pixel height so that we yield an appropriately sized scrollbar. ***(This is the current BIG problem: browsers limit you to max. height of about 3 million pixel, which in my case allows only roughly about 100k lines. Sadly the only solution to this is to implement your own scrollbar...)***
3. After the quickload a separate worker is started to calculate the exact number of lines and update the estimate and derived values as fast as possible, because quickly knowing the exact number of lines is important
4. Currently after that a second worker is started to load all data into the browser (**background load**). The data is load in chunks of 17k lines (per second in the example file).
5. After the first scroll event on the quickloaded data the dynamic load grabs the needed data from the background loaded data. However: currently the background load needs to have finished if the user directly wants to jump to the end. So I need an abstraction here that checks if the needed data was already loaded, and if not grabs it directly from the file.

## Install, run and develop
This is setup in a really primitive but easy to use way: 
- no npm or node or other fancy shit is needed
- simply checkout or download the source code
- serve the `index.html` with a local mini server.

Personally I use for this the comfy VS Code plugin `Live Server` https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer

## Overview of the files
Bootstrap and Vue.js are included via CDN all other libs are local downloads. Overview of the files:
- `index.html`: some test markup and the actual component, contains no scripts or css, only used for markup and linking js/css
- `linecountWorker.js`: js worker code for counting exact number of lines 
- `worker.js`: worker code for parsing all data and store locally in the browser (**background load**)
- `main.js`: contains the vue root/component in typical vue style. Here we have all backend logic that controls how the table should change and how the data is managed
- `styles.css`: styles that are relevant for creating a scrollbar, nothing too special here
- `testdata/100k_test.csv`: the file that I use for testing (it was generated via the mockery website... aaaand some bash magic, so some values are repeated here BUT: the ids are unique and increasing)
- `lib`: contains papaparse and line-navigator dependencies.