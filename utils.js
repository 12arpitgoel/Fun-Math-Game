function calSlope(x1, y1, x2, y2){
    return (y2-y1)/(x2-x1);
}

function calY(m, x, x0, y0){
    y = m * (x - x0) + y0 ;
    return y;
}
