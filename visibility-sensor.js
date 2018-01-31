'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var PropTypes = require('prop-types');
var createReactClass = require('create-react-class');

var containmentPropType = PropTypes.any;

if (typeof window !== 'undefined') {
  containmentPropType = PropTypes.instanceOf(Element);
}

module.exports = createReactClass({
  displayName: 'VisibilitySensor',

  propTypes: {
    onChange: PropTypes.func.isRequired,
    active: PropTypes.bool,
    partialVisibility: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
    ]),
    delay: PropTypes.number,
    delayedCall: PropTypes.bool,
    containment: containmentPropType,
    children: PropTypes.element,
    minTopValue: PropTypes.number
  },

  getDefaultProps: function () {
    return {
      active: true,
      partialVisibility: false,
      minTopValue: 0,
      delay: 1000,
      delayedCall: false,
      containment: null,
      children: React.createElement('span')
    };
  },

  getInitialState: function () {
    return {
      isVisible: null,
      visibilityRect: {}
    };
  },

  componentDidMount: function () {
    if (this.props.active) {
      this.startWatching();
    }
  },

  componentWillUnmount: function () {
    this.stopWatching();
  },

  componentWillReceiveProps: function (nextProps) {
    if (nextProps.active && !this.props.active) {
      this.setState(this.getInitialState());
      this.startWatching();
    }
    if (!nextProps.active && this.props.active) {
      this.stopWatching();
    }
  },

  startWatching: function () {
    if (this.interval) { return; }
    this.interval = setInterval(this.check, this.props.delay);
    // if dont need delayed call, check on load ( before the first interval fires )
    !this.props.delayedCall && this.check();
  },

  stopWatching: function () {
    this.interval = clearInterval(this.interval);
  },

  /**
   * Check if the element is within the visible viewport
   */
  check: function () {
    var el = ReactDOM.findDOMNode(this);
    var rect;
    var containmentRect;

    // if the component has rendered to null, dont update visibility
    if (!el) {
      return this.state;
    }

    rect = el.getBoundingClientRect();

    if (this.props.containment) {
      containmentRect = this.props.containment.getBoundingClientRect();
    } else {
      containmentRect = {
        top: 0,
        left: 0,
        bottom: window.innerHeight || document.documentElement.clientHeight,
        right: window.innerWidth || document.documentElement.clientWidth
      };
    }

    var visibilityRect = {
      top: rect.top >= containmentRect.top,
      left: rect.left >= containmentRect.left,
      bottom: rect.bottom <= containmentRect.bottom,
      right: rect.right <= containmentRect.right
    };

    var fullVisible = (
      visibilityRect.top &&
      visibilityRect.left &&
      visibilityRect.bottom &&
      visibilityRect.right
    );

    var isVisible = fullVisible;

    // check for partial visibility
    if (this.props.partialVisibility) {
      var partialVertical =
          (rect.top >= containmentRect.top && rect.top <= containmentRect.bottom)           // Top is visible
          || (rect.bottom >= containmentRect.top && rect.bottom <= containmentRect.bottom)  // Bottom is visible
          || (rect.top <= containmentRect.top && rect.bottom >= containmentRect.bottom);    // Center is visible


      var partialHorizontal =
          (rect.left >= containmentRect.left && rect.left <= containmentRect.right)         // Left side is visible
          || (rect.right >= containmentRect.left && rect.right <= containmentRect.right)    // Right side is visible
          || (rect.left <= containmentRect.left && rect.right >= containmentRect.right);    // Center is visible

      var partialVisible = partialVertical && partialHorizontal;

      // account for partial visibility on a single edge
      if (typeof this.props.partialVisibility === 'string') {
        partialVisible = visibilityRect[this.props.partialVisibility]
      }

      // if we have minimum top visibility set by props, lets check, if it meets the passed value
      // so if for instance element is at least 200px in viewport, then show it.
      isVisible = this.props.minTopValue
        ? partialVisible && rect.top <= (containmentRect.bottom - this.props.minTopValue)
        : partialVisible
    }

    var state = this.state
    // notify the parent when the value changes
    if (this.state.isVisible !== isVisible) {
      state = {
        isVisible: isVisible,
        visibilityRect: visibilityRect
      };
      this.setState(state);
      this.props.onChange(isVisible, visibilityRect);
    }

    return state;
  },

  render: function () {
    return React.Children.only(this.props.children);
  }
});
