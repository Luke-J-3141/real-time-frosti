
// Define masking lines for each ellipse
function getUpperEllipseMaskLine() {
    const { slopet, interseptt} = getEllipseConstants();
    
    return {
        slope: slopet,
        intercept: interseptt, // y-intercept
    };
}

function getLowerEllipseMaskLine() {
    const {slopel, interseptl} = getEllipseConstants();
    
    return {
        slope: slopel, 
        intercept: interseptl, // y-intercept
    };
}

function isPointAboveMaskLine(x, y, maskLine) {
    // Line equation: y = slope * x + intercept
    const lineY = maskLine.slope * x + maskLine.intercept;
    return y < lineY; // Point is above the line

}

function isLeftOfSourcePlane(x, y) {
    const { x1, y1, x2, y2 } = computeSourceLine();
    
    // Calculate the cross product to determine which side of the line the point is on
    // For a line from (x1,y1) to (x2,y2) and point (x,y):
    // cross product = (x2-x1)*(y-y1) - (y2-y1)*(x-x1)
    const crossProduct = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1);
    
    // If cross product > 0, point is to the left of the line (when looking from start to end)
    // If cross product < 0, point is to the right of the line
    // If cross product = 0, point is on the line
    return crossProduct > 0;
}
// TODO add proximity constraints 