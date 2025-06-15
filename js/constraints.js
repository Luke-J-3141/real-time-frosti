
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

// Only Draw reflectors and calculate reflection if ellipse is above constraint
// On toggle so can see with or without
function isaboveProximity() {
    const y_proximity = 600; // Distance from TM for proximity

    
}

function isaboveAperture() {
    const x_proximity = 1630; // Distance for aperture


}