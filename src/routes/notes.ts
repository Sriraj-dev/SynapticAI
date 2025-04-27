
import { Context, Hono } from "hono";
import { NotesController } from "../controllers/notes.controller";
import { addSessionDetails, authMiddleware } from "../middlewares/auth";
import { NotesAccessController } from "../controllers/notes.access.controller";
import { StatusCodes } from "../utils/statusCodes";
import { AccessRequestModel, GrantAccessRequest, NoteCreateRequest, UpdateAccessRequest } from "../utils/apiModels/requestModels";
import { AccessStatus } from "../db/schema";

const notesRouter = new Hono();
notesRouter.use('*', authMiddleware)
notesRouter.use("*", addSessionDetails)

notesRouter.get("/", (c) => NotesController.getAllNotes(c))
notesRouter.get("/:id", (c) => NotesController.getNoteById(c))

notesRouter.post("/create", async (c : Context) =>{
    const userId = c.get("userId")
    const body = await c.req.json<NoteCreateRequest>()

    const note = await NotesController.createNote(userId,body)

    return c.json({ message: 'Succesfull', data : note}, StatusCodes.CREATED);
})

notesRouter.delete("/delete/:id", (c) => NotesController.deleteUserNote(c))
notesRouter.post("/update/:id", (c) => NotesController.updateUserNote(c))

notesRouter.get("/getAccessRequests", async (c : Context) => {
    const ownerId = c.get("userId")
    const accessRequests = await NotesAccessController.getAccessRequests(ownerId)

    return c.json({message: "Successfull", data: accessRequests}, StatusCodes.OK)
})

// Used by owner to give view/edit access to multiple users
notesRouter.post("/grantAccess", async (c : Context) => {
    const userId = c.get("userId")
    const body = await c.req.json<GrantAccessRequest>()

    const accessRequest = await NotesAccessController.addNoteAccess(body.noteId, userId, body.view_access_Ids, body.edit_access_Ids, AccessStatus.Granted)

    return c.json({message: "Successfully Executed", data: accessRequest}, StatusCodes.OK)
}) 

// Used by the owener to reject/accept the request.
notesRouter.patch("/updateAccessRequest", async (c : Context) => {
    const userId = c.get("userId")
    const body = await c.req.json<UpdateAccessRequest>()

    const request = await NotesAccessController.updateAccessRequest(body.requestId, body.status)

    return c.json({message: "Successfully Executed", data: request}, StatusCodes.OK)
}) 

// Used by other users to request access to a note .
notesRouter.post("/requestAccess", async (c : Context) => {
    const userId = c.get("userId")
    const body = await c.req.json<AccessRequestModel>()

    const request = await NotesAccessController.requestAccess(userId, body.noteId, body.access)

    return c.json({message: "Successfully Executed", data: request}, StatusCodes.OK)
}) 


export default notesRouter;