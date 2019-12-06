"use strict";

/*--------------------------------------------------------------------------------

The proportions below just happen to match the dimensions of my physical space
and the tables in that space.

Note that I measured everything in inches, and then converted to units of meters
(which is what VR requires) by multiplying by 0.0254.

--------------------------------------------------------------------------------*/

export const inchesToMeters = inches => inches * 0.0254;
export const metersToInches = meters => meters / 0.0254;

export const EYE_HEIGHT       = inchesToMeters( 69);
export const HALL_LENGTH      = inchesToMeters(306);
export const HALL_WIDTH       = inchesToMeters(215);
export const RING_RADIUS      = 0.0425;
export const TABLE_DEPTH      = inchesToMeters( 30);
export const TABLE_HEIGHT     = inchesToMeters( 29);
export TABLE_WIDTH            = inchesToMeters( 60);
export TABLE_THICKNESS        = inchesToMeters( 11/8);
export LEG_THICKNESS          = inchesToMeters(  2.5);
