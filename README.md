# Public Water Systems
Survey on Drinking Water Quality

> For a description of the project please visit the [project's website](http://arthuryidi.com/public-water-systems/).

[View Project](https://arthuryidi.github.io/pws/)

## Running Locally

Run a local server or use:

    $ ./run

## Source Files

- **data/pws.json**
  
  Contains the main data gathered and converted to JSON from EPA's website.


```
"28105": {
    "LOCATION": "Oktibbeha",
        "PWS": [
        {
            "NAME": "CENTER GROVE W/A #2",
            "SIZE": 120,
            "VIOLATIONS_COUNT": 2
        },
        ...
        ],
        "TOTAL_SIZE": 65482,
        "NUM_PWS": 26,
        "TOTAL_VIOLATIONS": 3124
}
```

- **data/state-fips.json**

  Convert state fip code to the state's name.

```
{
   "01" : "Alabama",
   "02" : "Alaska",
   "04" : "Arizona",
   ...
}
```

- **data/us-counties.json**

  Contains a TopoJSON map of US counties.

- **data/us-states.json**

  Contains a TopoJSON map of US states.

- **main.js**

  Main script contains the main logic for the application and uses d3 for creating the visualizations.
