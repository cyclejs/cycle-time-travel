const styles = {
  '.time-travel': {
    'position': 'fixed',
    'bottom': '0',
    'background': 'lightgray',
    'width': '100%',
    '-moz-user-select': 'none',
    '-webkit-user-select': 'none'
  },

  '.stream-value': {
    'position': 'absolute',
    'border-radius': '30px',
    'background': '#FAFAFA',
    'color': 'black',
    'padding': '2px 8px',
    'text-align': 'center',
    'margin': '6px',
    'white-space': 'nowrap'
  },

  '.stream': {
    'height': '45px',
    'font-size': '1.7em',
    'font-family': 'Helvetica',
    'border-top': '#CFCFCF 1px solid'
  },

  '.stream-title': {
    'margin': '5px',
    'color': '#757575',
    'position': 'fixed'
  },

  '.stream-marker': {
    'position': 'fixed',
    'height': '100%',
    'border-left': '1px solid red',
    'border-right': '1px solid darkred',
    'width': '0px',
    'left': '72%'
  },

  '.widget': {
    'display': 'inline-block'
  },

  '.count': {
    'margin': '10px'
  }
}

module.exports = (key) => styles[key];
